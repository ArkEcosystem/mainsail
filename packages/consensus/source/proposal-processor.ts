import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ProposalProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signature!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.IAggregator;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async process(data: Buffer, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		const proposal = await this.#makeProposal(data);

		if (!proposal) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (this.#isInvalidHeightOrRound(proposal)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		if (this.#isInvalidProposer(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (await this.#hasInvalidSignature(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (this.#isInvalidBlockGenerator(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (await this.#hasInvalidLockProof(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const roundState = this.roundStateRepo.getRoundState(proposal.height, proposal.round);
		if (roundState.hasProposal()) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		roundState.addProposal(proposal);
		await this.storage.saveProposal(proposal);

		if (broadcast) {
			void this.broadcaster.broadcastProposal(proposal);
		}

		void this.#getConsensus().handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makeProposal(data: Buffer): Promise<Contracts.Crypto.IProposal | undefined> {
		try {
			return await this.factory.makeProposalFromBytes(data);
		} catch {
			return undefined;
		}
	}

	#isInvalidProposer(proposal: Contracts.Crypto.IProposal): boolean {
		return proposal.validatorIndex !== this.proposerPicker.getValidatorIndex(proposal.round);
	}

	async #hasInvalidSignature(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		const verified = await this.signature.verify(
			Buffer.from(proposal.signature, "hex"),
			await this.messageSerializer.serializeProposal(proposal, { includeSignature: false }),
			Buffer.from(this.validatorSet.getValidator(proposal.validatorIndex).getConsensusPublicKey(), "hex"),
		);

		return !verified;
	}

	async #hasInvalidLockProof(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		if (proposal.validRound === undefined) {
			return false;
		}

		if (proposal.validRound >= proposal.round) {
			this.logger.debug(
				`Received proposal ${proposal.height}/${proposal.round} has validRound ${proposal.validRound} >= round ${proposal.round}`,
			);
		}

		const lockProof = proposal.block.lockProof;
		if (!lockProof) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with missing lock proof`);
			return true;
		}

		const data = await this.messageSerializer.serializePrevoteForSignature({
			blockId: proposal.block.block.header.id,
			height: proposal.height,
			round: proposal.validRound,
			type: Contracts.Crypto.MessageType.Prevote,
		});
		const verified = await this.aggregator.verify(lockProof, data);

		if (!verified) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid lock proof`);
		}

		return !verified;
	}

	#isInvalidBlockGenerator(proposal: Contracts.Crypto.IProposal): boolean {
		if (proposal.validRound !== undefined) {
			// We assume that this check passed when block was proposed first time, so we don't need to check it again.
			// The check also cannot be repeated because we don't hold the value when the block was proposed first time.
			return false;
		}

		const proposer = this.validatorSet.getValidator(this.proposerPicker.getValidatorIndex(proposal.round));
		const isInvalid = proposal.block.block.data.generatorPublicKey !== proposer.getWalletPublicKey();

		if (isInvalid) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid block generator`);
		}

		return isInvalid;
	}

	#isInvalidHeightOrRound(message: { height: number; round: number }): boolean {
		return !(
			message.height === this.#getConsensus().getHeight() && message.round >= this.#getConsensus().getRound()
		);
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}

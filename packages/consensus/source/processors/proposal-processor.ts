import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class ProposalProcessor extends AbstractProcessor implements Contracts.Consensus.IProcessor {
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

		if (!this.hasValidHeightOrRound(proposal)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		if (!this.#hasValidProposer(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!(await this.#hasValidSignature(proposal))) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!this.#hasValidBlockGenerator(proposal)) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!(await this.#hasValidLockProof(proposal))) {
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

		this.handle(roundState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makeProposal(data: Buffer): Promise<Contracts.Crypto.IProposal | undefined> {
		try {
			return await this.factory.makeProposalFromBytes(data);
		} catch {
			return undefined;
		}
	}

	#hasValidProposer(proposal: Contracts.Crypto.IProposal): boolean {
		return proposal.validatorIndex === this.proposerPicker.getValidatorIndex(proposal.round);
	}

	async #hasValidSignature(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		return this.signature.verify(
			Buffer.from(proposal.signature, "hex"),
			await this.messageSerializer.serializeProposal(proposal, { includeSignature: false }),
			Buffer.from(this.validatorSet.getValidator(proposal.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}

	async #hasValidLockProof(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		if (proposal.validRound === undefined) {
			return true;
		}

		if (proposal.validRound >= proposal.round) {
			this.logger.debug(
				`Received proposal ${proposal.height}/${proposal.round} has validRound ${proposal.validRound} >= round ${proposal.round}`,
			);

			return false;
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

		return verified;
	}

	#hasValidBlockGenerator(proposal: Contracts.Crypto.IProposal): boolean {
		if (proposal.validRound !== undefined) {
			// We assume that this check passed when block was proposed first time, so we don't need to check it again.
			// The check also cannot be repeated because we don't hold the value when the block was proposed first time.
			return true;
		}

		const proposer = this.validatorSet.getValidator(this.proposerPicker.getValidatorIndex(proposal.round));
		const isValid = proposal.block.block.data.generatorPublicKey === proposer.getWalletPublicKey();

		if (!isValid) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid block generator`);
		}

		return isValid;
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ProposalProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Message.Verifier)
	private readonly verifier!: Contracts.Crypto.IMessageVerifier;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

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

	async #hasInvalidSignature(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		const { errors } = await this.verifier.verifyProposal(proposal);
		if (errors.length > 0) {
			this.logger.debug(`Received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
			return true;
		}

		return false;
	}

	async #hasInvalidLockProof(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		if (!proposal.validRound) {
			return false;
		}

		const lockProof = proposal.block.lockProof;
		if (!lockProof) {
			return true;
		}

		const { verified } = await this.verifier.verifyProposalLockProof(
			{
				blockId: proposal.block.block.header.id,
				height: proposal.height,
				round: proposal.round,
				type: Contracts.Crypto.MessageType.Prevote,
			},
			lockProof,
		);

		if (!verified) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid lock proof`);
		}

		return !verified;
	}

	#isInvalidProposer(proposal: Contracts.Crypto.IProposal): boolean {
		return proposal.validatorIndex !== this.proposerPicker.getValidatorIndex(proposal.round);
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

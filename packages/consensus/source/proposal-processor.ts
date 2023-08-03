import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ProposalProcessor implements Contracts.Consensus.IProposalProcessor {
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

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async process(data: Buffer): Promise<Contracts.Consensus.ProcessorResult> {
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

		const roundState = this.roundStateRepo.getRoundState(proposal.height, proposal.round);
		if (roundState.hasProposal()) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		await roundState.addProposal(proposal);

		await this.storage.saveProposal(proposal);

		// TODO: Process block
		await this.#getConsensus().handle(roundState);

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
			this.logger.warning(`received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
			return true;
		}

		return false;
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

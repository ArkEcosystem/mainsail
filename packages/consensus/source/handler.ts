import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { CommittedBlockState } from "./committed-block-state";
import { RoundStateRepository } from "./round-state-repository";

@injectable()
export class Handler implements Contracts.Consensus.IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: RoundStateRepository;

	@inject(Identifiers.Cryptography.Message.Verifier)
	private readonly verifier!: Contracts.Crypto.IMessageVerifier;

	async onProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		if (!this.#isValidHeightAndRound(proposal)) {
			return;
		}

		const { errors } = await this.verifier.verifyProposal(proposal);
		if (errors.length > 0) {
			this.logger.warning(`received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = await this.roundStateRepo.getRoundState(proposal.height, proposal.round);
		if (await roundState.addProposal(proposal)) {
			await this.#handle(roundState);
		}
	}

	async onPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
		if (!this.#isValidHeightAndRound(prevote)) {
			return;
		}

		const { errors } = await this.verifier.verifyPrevote(prevote);
		if (errors.length > 0) {
			this.logger.warning(`received invalid prevote: ${prevote.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = await this.roundStateRepo.getRoundState(prevote.height, prevote.round);

		if (await roundState.addPrevote(prevote)) {
			await this.#handle(roundState);
		}
	}

	async onPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
		if (!this.#isValidHeightAndRound(precommit)) {
			return;
		}

		const { errors } = await this.verifier.verifyPrecommit(precommit);
		if (errors.length > 0) {
			this.logger.warning(
				`received invalid precommit: ${precommit.toString()} errors: ${JSON.stringify(errors)}`,
			);
			return;
		}

		const roundState = await this.roundStateRepo.getRoundState(precommit.height, precommit.round);

		if (await roundState.addPrecommit(precommit)) {
			await this.#handle(roundState);
		}
	}

	async onCommittedBlock(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
		// TODO: Check precommits
		// TODO: Check block
		// TODO: Create roundState
		// TODO: Call onMajorityPrecommit

		const committedBlockState = await this.app.resolve(CommittedBlockState).configure(committedBlock);

		committedBlockState.setProcessorResult(await this.processor.process(committedBlockState));

		const consensus = this.#getConsensus();
		await consensus.onMajorityPrecommit(committedBlockState);
	}

	#isValidHeightAndRound(message: { height: number; round: number }): boolean {
		return message.height === this.#getConsensus().getHeight() && message.round >= this.#getConsensus().getRound();
	}

	async #handle(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const consensus = this.#getConsensus();

		await consensus.onProposal(roundState);
		await consensus.onProposalLocked(roundState);

		if (roundState.hasMajorityPrevotes()) {
			await consensus.onMajorityPrevote(roundState);
		}

		if (roundState.hasMajorityPrevotesAny()) {
			await consensus.onMajorityPrevoteAny(roundState);
		}

		if (roundState.hasMajorityPrevotesNull()) {
			await consensus.onMajorityPrevoteNull(roundState);
		}

		if (roundState.hasMajorityPrecommitsAny()) {
			await consensus.onMajorityPrecommitAny(roundState);
		}

		if (roundState.hasMajorityPrecommits()) {
			await consensus.onMajorityPrecommit(roundState);
		}

		if (roundState.hasMinorityPrevotesOrPrecommits()) {
			await consensus.onMinorityWithHigherRound(roundState);
		}
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}

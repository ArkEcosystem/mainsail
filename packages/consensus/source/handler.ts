import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Consensus } from "./consensus";
import { RoundState } from "./round-state";
import { RoundStateRepository } from "./round-state-repository";

@injectable()
export class Handler implements Contracts.Consensus.IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

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
		if (roundState.addProposal(proposal)) {
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

		if (roundState.addPrevote(prevote)) {
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

		if (roundState.addPrecommit(precommit)) {
			await this.#handle(roundState);
		}
	}

	#isValidHeightAndRound(message: { height: number; round: number }): boolean {
		return message.height === this.#getConsensus().getHeight() && message.round >= this.#getConsensus().getRound();
	}

	async #handle(roundState: RoundState): Promise<void> {
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

	#getConsensus(): Consensus {
		return this.app.get<Consensus>(Identifiers.Consensus.Service);
	}
}

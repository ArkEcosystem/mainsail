import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";
import { RoundState } from "./round-state";
import { RoundStateRepository } from "./round-state-repository";
import { IConsensus, IHandler, IVerifier } from "./types";

@injectable()
export class Handler implements IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: RoundStateRepository;

	@inject(Identifiers.Consensus.Verifier)
	private readonly verifier!: IVerifier;

	async onProposal(proposal: Proposal): Promise<void> {
		const data = proposal.toData();

		const { errors } = await this.verifier.verifyProposal(data);
		if (errors.length > 0) {
			this.logger.warning(`received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(data.height, data.round);
		roundState.setProposal(proposal);

		await this.#getConsensus().onProposal(proposal);
	}

	async onPrevote(prevote: Prevote): Promise<void> {
		const data = prevote.toData();

		const { errors } = await this.verifier.verifyPrevote(data);
		if (errors.length > 0) {
			this.logger.warning(`received invalid prevote: ${prevote.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(data.height, data.round);

		roundState.addPrevote(prevote);

		await this.#handle(roundState);
	}

	async onPrecommit(precommit: Precommit): Promise<void> {
		const data = precommit.toData();

		const { errors } = await this.verifier.verifyPrecommit(data);
		if (errors.length > 0) {
			this.logger.warning(
				`received invalid precommit: ${precommit.toString()} errors: ${JSON.stringify(errors)}`,
			);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(precommit.toData().height, precommit.toData().round);

		roundState.addPrecommit(precommit);

		await this.#handle(roundState);
	}

	async #handle(roundState: RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (!proposal) {
			return;
		}

		const consensus = this.#getConsensus();

		if (roundState.hasMajorityPrevotes()) {
			await consensus.onMajorityPrevote(proposal);
		}

		if (roundState.hasMajorityPrecommits()) {
			await consensus.onMajorityPrecommit(proposal);
		}
	}

	#getConsensus(): IConsensus {
		return this.app.get<IConsensus>(Identifiers.Consensus.Service);
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";
import { RoundState } from "./round-state";
import { RoundStateRepository } from "./round-state-repository";
import { IConsensus, IHandler } from "./types";

@injectable()
export class Handler implements IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: RoundStateRepository;

	async onProposal(proposal: Proposal): Promise<void> {
		const roundState = this.roundStateRepo.getRoundState(proposal.toData().height, proposal.toData().round);
		roundState.setProposal(proposal);

		await this.#getConsensus().onProposal(proposal);
	}

	async onPrevote(prevote: Prevote): Promise<void> {
		const roundState = this.roundStateRepo.getRoundState(prevote.toData().height, prevote.toData().round);

		roundState.addPrevote(prevote);

		await this.#handle(roundState);
	}

	async onPrecommit(precommit: Precommit): Promise<void> {
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

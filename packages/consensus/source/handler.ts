import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";
import { IConsensus, IHandler } from "./types";

@injectable()
export class Handler implements IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	async onProposal(proposal: Proposal): Promise<void> {
		await this.#getConsensus().onProposal(proposal);
	}
	async onPrevote(prevote: Prevote): Promise<void> {}
	async onPrecommit(precommit: Precommit): Promise<void> {}

	#getConsensus(): IConsensus {
		return this.app.get<IConsensus>(Identifiers.Consensus.Service);
	}
}

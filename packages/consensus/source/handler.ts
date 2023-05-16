import { injectable } from "@mainsail/container";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";

@injectable()
export class Handler {
	async onProposal(proposal: Proposal): Promise<void> {}
	async onPrevote(prevote: Prevote): Promise<void> {}
	async onPrecommit(precommit: Precommit): Promise<void> {}
}

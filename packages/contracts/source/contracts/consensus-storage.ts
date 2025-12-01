import type { State, StateData } from "./consensus/index.js";
import type { Precommit, Prevote, Proposal } from "./crypto/index.js";

export interface Service {
	persist({
		state,
		proposals,
		precommits,
		prevotes,
	}: {
		state: State;
		proposals: Proposal[];
		prevotes: Prevote[];
		precommits: Precommit[];
	}): Promise<void>;
	getState(): Promise<StateData | undefined>;
	getProposals(): Promise<Proposal[]>;
	getPrevotes(): Promise<Prevote[]>;
	getPrecommits(): Promise<Precommit[]>;
}

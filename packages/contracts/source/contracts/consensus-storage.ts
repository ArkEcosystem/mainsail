import type { State, StateData } from "./consensus/index.js";
import type { Precommit, Message, Proposal } from "./crypto/index.js";

export interface Service {
	persist({
		state,
		proposals,
		precommits,
		prevotes,
	}: {
		state: State;
		proposals: Proposal[];
		prevotes: Message[];
		precommits: Precommit[];
	}): Promise<void>;
	getState(): Promise<StateData | undefined>;
	getProposals(): Promise<Proposal[]>;
	getPrevotes(): Promise<Message[]>;
	getPrecommits(): Promise<Precommit[]>;
}

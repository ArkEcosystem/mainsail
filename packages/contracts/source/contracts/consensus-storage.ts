import type { State, StateData } from "./consensus/index.js";
import type { Message, Proposal } from "./crypto/index.js";

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
		precommits: Message[];
	}): Promise<void>;
	getState(): Promise<StateData | undefined>;
	getProposals(): Promise<Proposal[]>;
	getPrevotes(): Promise<Message[]>;
	getPrecommits(): Promise<Message[]>;
}

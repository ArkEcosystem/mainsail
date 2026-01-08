import type { State, StateData } from "./consensus/index.js";
import type { Message, Proposal } from "./crypto/index.js";

export interface Service {
	persist({
		state,
		proposals,
		messages,
	}: {
		state: State;
		proposals: Proposal[];
		messages: Message[];
	}): Promise<void>;
	getState(): Promise<StateData | undefined>;
	getProposals(): Promise<Proposal[]>;
	getMessages(): Promise<Message[]>;
}

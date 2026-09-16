import type { StateData } from "./consensus/index.js";
import type { Message, Proposal } from "./crypto/index.js";

export interface Service {
	saveState(state: StateData): Promise<void>;
	saveProposal(proposal: Proposal): Promise<void>;
	saveMessage(message: Message): Promise<void>;
	getState(): Promise<StateData | undefined>;
	getProposals(): Promise<Proposal[]>;
	getMessages(): Promise<Message[]>;
}

import { State, StateData } from "./consensus/index.js";
import { Precommit, Prevote, Proposal } from "./crypto/index.js";

export interface Service {
	getState(): Promise<StateData | undefined>;
	saveState(state: State): Promise<void>;
	saveProposals(proposal: Proposal[]): Promise<void>;
	savePrevotes(prevotes: Prevote[]): Promise<void>;
	savePrecommits(precommits: Precommit[]): Promise<void>;
	getProposals(): Promise<Proposal[]>;
	getPrevotes(): Promise<Prevote[]>;
	getPrecommits(): Promise<Precommit[]>;
	clear(): Promise<void>;
}

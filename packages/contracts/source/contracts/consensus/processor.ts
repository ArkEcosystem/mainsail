import { Commit, Precommit, Prevote, Proposal } from "../crypto/index.js";
import { ProcessorResult } from "./enums.js";

export interface ProposalProcessor {
	process(proposal: Proposal, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidLockProof(proposal: Proposal): Promise<boolean>;
}

export interface PrevoteProcessor {
	process(prevote: Prevote, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface PrecommitProcessor {
	process(prevote: Precommit, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface CommitProcessor {
	process(commit: Commit, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidSignature(commit: Commit): Promise<boolean>;
}

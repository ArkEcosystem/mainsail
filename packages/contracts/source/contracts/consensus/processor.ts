import type { Commit, Message, Message, Proposal } from "../crypto/index.js";
import type { ProcessorResult } from "./enums.js";

export interface ProposalProcessor {
	process(proposal: Proposal, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidLockProof(proposal: Proposal): Promise<boolean>;
}

export interface PrevoteProcessor {
	process(prevote: Message, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface PrecommitProcessor {
	process(prevote: Message, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface CommitProcessor {
	process(commit: Commit, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidSignature(commit: Commit): Promise<boolean>;
}

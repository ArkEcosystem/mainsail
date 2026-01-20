import type { Commit, Message, Proposal } from "../crypto/index.js";
import type { ProcessorResult } from "./enums.js";

export interface ProposalProcessor {
	process(proposal: Proposal, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidLockProof(proposal: Proposal): Promise<boolean>;
}

export interface MessageProcessor {
	process(message: Message, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface CommitProcessor {
	process(commit: Commit, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidSignature(commit: Commit): Promise<boolean>;
}

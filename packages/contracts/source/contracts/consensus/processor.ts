import { Precommit, Prevote, Proposal } from "../crypto";
import { Commit } from "../crypto/commit";
import { ProcessorResult } from "./enums";

export interface ProposalProcessor {
	process(proposal: Proposal, broadcast?: boolean): Promise<ProcessorResult>;
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

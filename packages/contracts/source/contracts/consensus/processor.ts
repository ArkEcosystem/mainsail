import { Precommit, Prevote, Proposal } from "../crypto";
import { CommittedBlock } from "../crypto/commit";
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

export interface CommittedBlockProcessor {
	process(committedBlock: CommittedBlock, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidSignature(committedBlock: CommittedBlock): Promise<boolean>;
}

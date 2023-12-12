import { ICommittedBlock, IPrecommit, IPrevote, IProposal } from "../crypto";
import { ProcessorResult } from "./enums";

export interface IProposalProcessor {
	process(proposal: IProposal, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface IPrevoteProcessor {
	process(prevote: IPrevote, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface IPrecommitProcessor {
	process(prevote: IPrecommit, broadcast?: boolean): Promise<ProcessorResult>;
}

export interface ICommittedBlockProcessor {
	process(committedBlock: ICommittedBlock, broadcast?: boolean): Promise<ProcessorResult>;
	hasValidSignature(committedBlock: ICommittedBlock): Promise<boolean>;
}

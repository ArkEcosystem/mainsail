import { Proposal } from "../crypto/messages.js";

export type HeaderData = {
	version: string;
	blockNumber: number;
	round: number;
	step: number;
	proposedBlockHash?: string;
	validatorsSignedPrevote: readonly boolean[];
	validatorsSignedPrecommit: readonly boolean[];
};

export interface Header {
	blockNumber: number;
	round: number;
	proposal?: Proposal;
	validatorsSignedPrecommit: readonly boolean[];
	validatorsSignedPrevote: readonly boolean[];

	toData(): HeaderData;
	getValidatorsSignedPrecommitCount(): number;
	getValidatorsSignedPrevoteCount(): number;
}

export type HeaderFactory = () => Header;

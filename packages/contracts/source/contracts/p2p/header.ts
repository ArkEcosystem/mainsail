import { Contracts } from "../..";

export type HeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	proposedBlockId?: string;
	validatorsSignedPrevote: readonly boolean[];
	validatorsSignedPrecommit: readonly boolean[];
};

export interface Header {
	height: number;
	round: number;
	proposal?: Contracts.Crypto.Proposal;
	validatorsSignedPrecommit: readonly boolean[];
	validatorsSignedPrevote: readonly boolean[];

	toData(): HeaderData;
	getValidatorsSignedPrecommitCount(): number;
	getValidatorsSignedPrevoteCount(): number;
}

export type HeaderFactory = () => Header;

import { Contracts } from "../..";

export type IHeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	proposedBlockId?: string;
	validatorsSignedPrevote: readonly boolean[];
	validatorsSignedPrecommit: readonly boolean[];
};

export interface IHeader {
	height: number;
	round: number;
	proposal?: Contracts.Crypto.IProposal;
	validatorsSignedPrecommit: readonly boolean[];
	validatorsSignedPrevote: readonly boolean[];

	toData(): IHeaderData;
	getValidatorsSignedPrecommitCount(): number;
	getValidatorsSignedPrevoteCount(): number;
}

export type HeaderFactory = () => IHeader;

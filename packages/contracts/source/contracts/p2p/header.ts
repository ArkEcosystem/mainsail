import { IRoundState } from "../consensus/consensus";

export type IHeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	proposedBlockId?: string;
	validatorsSignedPrevote: boolean[];
	validatorsSignedPrecommit: boolean[];
};

export interface IHeader {
	height: number;
	round: number;
	roundState: IRoundState;
	validatorsSignedPrecommit: boolean[];
	validatorsSignedPrevote: boolean[];

	toData(): IHeaderData;
	canDownloadProposal(headerData: IHeaderData): boolean;
	canDownloadMessages(headerData: IHeaderData): boolean;
	getValidatorsSignedPrecommitCount(): number;
	getValidatorsSignedPrevoteCount(): number;
}

export type HeaderFactory = () => IHeader;

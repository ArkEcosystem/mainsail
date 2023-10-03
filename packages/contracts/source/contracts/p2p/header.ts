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
	validatorsSignedPrecommit: readonly boolean[];
	validatorsSignedPrevote: readonly boolean[];

	toData(): IHeaderData;
	canDownloadProposal(headerData: IHeaderData): boolean;
	getValidatorsSignedPrecommitCount(): number;
	getValidatorsSignedPrevoteCount(): number;
}

export type HeaderFactory = () => IHeader;

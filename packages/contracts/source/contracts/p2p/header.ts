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
	toData(): IHeaderData;
	canDownloadBlocks(headerData: IHeaderData): boolean;
	canDownloadProposal(headerData: IHeaderData): boolean;
	canDownloadMessages(headerData: IHeaderData): boolean;
}

export type HeaderFactory = () => IHeader;

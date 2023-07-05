export type IHeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	proposedBlockId: string | null;
	validatorsSignedPrevote: boolean[];
	validatorsSignedPrecommit: boolean[];
};

export interface IHeader {
	toData(): IHeaderData;
	// hasHigherHeight(headerData: IHeaderData): boolean;
	// hasMissingProposal(headerData: IHeaderData): boolean;
	// hasMissingMessages(headerData: IHeaderData): boolean;
}

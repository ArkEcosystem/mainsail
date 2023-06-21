export type IHeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	validatorsSignedPrevote: boolean[];
	validatorsSignedPrecommit: boolean[];
};

export interface IHeader {
	getHeader(): Promise<IHeaderData>;
	// handle(header: IHeaderData): Promise<void>;
}

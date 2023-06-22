import { Peer } from "./peer";

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
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

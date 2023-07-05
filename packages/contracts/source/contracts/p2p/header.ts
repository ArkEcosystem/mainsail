import { IHeaderData, Peer } from "./peer";

export interface IHeader {
	getHeader(): IHeaderData;
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

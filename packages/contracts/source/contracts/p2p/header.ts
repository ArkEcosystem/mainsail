import { IHeaderData, Peer } from "./peer";

export interface IHeader {
	getHeader(): Promise<IHeaderData>;
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

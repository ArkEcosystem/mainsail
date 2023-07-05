import { IHeaderData, Peer } from "./peer";

export interface IHeaderService {
	getHeader(): IHeaderData;
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

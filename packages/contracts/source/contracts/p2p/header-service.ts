import { IHeader, IHeaderData } from "./header";
import { Peer } from "./peer";

export interface IHeaderService {
	getHeader(): IHeader;
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

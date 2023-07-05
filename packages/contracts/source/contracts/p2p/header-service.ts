import { IHeaderData } from "./header";
import { Peer } from "./peer";

export interface IHeaderService {
	handle(peer: Peer, header: IHeaderData): Promise<void>;
}

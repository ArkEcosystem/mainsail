import { HeaderData } from "./header.js";
import { Peer } from "./peer.js";

export interface HeaderService {
	handle(peer: Peer, header: HeaderData): Promise<void>;
}

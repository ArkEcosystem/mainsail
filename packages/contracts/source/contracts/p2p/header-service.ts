import type { HeaderData } from "./header.js";
import type { Peer } from "./peer.js";

export interface HeaderService {
	handle(peer: Peer, header: HeaderData): Promise<void>;
}

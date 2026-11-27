import type { HeaderData } from "./header.js";
import type { Peer } from "./peer.js";

export interface HeaderService {
	// Records the peer's header and, after a delay, starts the downloads it calls for. Does not wait
	// and does not throw.
	handle(peer: Peer, header: HeaderData): void;
}

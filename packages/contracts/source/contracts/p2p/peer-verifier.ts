import type { Peer } from "./peer.js";

export interface PeerVerifier {
	verify(peer: Peer): Promise<boolean>;
}

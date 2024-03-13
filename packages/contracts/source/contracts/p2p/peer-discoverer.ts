import { Peer } from "./peer.js";

export interface PeerDiscoverer {
	discoverPeers(peer: Peer): Promise<void>;
	populateSeedPeers(): Promise<void>;
}

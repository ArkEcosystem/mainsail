import { Peer } from "./peer";

export interface PeerDiscoverer {
	discoverPeers(peer: Peer): Promise<void>;
	populateSeedPeers(): Promise<void>;
}

import { Peer } from "./peer";

export interface PeerDiscoverer {
	discoverPeers(peer: Peer): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	populateSeedPeers(): Promise<void>;
}

import { Peer } from "./peer";

export interface PeerDiscoverer {
	discoverPeers(): Promise<void>;
	discoverPeersByPeer(peer: Peer): Promise<void>;
	populateSeedPeers(): Promise<void>;
}

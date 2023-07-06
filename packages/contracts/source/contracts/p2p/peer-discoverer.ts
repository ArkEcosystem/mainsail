export interface PeerDiscoverer {
	populateSeedPeers(): Promise<void>;
}

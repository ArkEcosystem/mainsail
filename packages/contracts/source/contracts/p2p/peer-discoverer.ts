export interface PeerDiscoverer {
	discoverPeers(pingAll?: boolean): Promise<boolean>;
	populateSeedPeers(): Promise<void>;
}

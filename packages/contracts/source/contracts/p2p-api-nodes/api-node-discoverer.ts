import type { Peer } from "../p2p-service/peer.js";

export interface ApiNodeDiscoverer {
	populateApiNodesFromConfiguration(): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	discoverNewApiNodes(): Promise<void>;
	refreshApiNodes(): Promise<void>;
}

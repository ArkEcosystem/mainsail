import { ApiNode } from "./api-node.js";
import { Peer } from "./peer.js";

export type ApiNodeFactory = (url: string) => ApiNode;

export interface ApiNodeDiscoverer {
	populateApiNodesFromConfiguration(): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	discoverNewApiNodes(): Promise<void>;
	refreshApiNodes(): Promise<void>;
}

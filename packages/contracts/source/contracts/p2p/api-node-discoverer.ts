import { ApiNode } from "./api-node";
import { PeerProtocol } from "./enums";
import { Peer } from "./peer";

export type ApiNodeFactory = (ip: string, port: string | number, protocol?: PeerProtocol) => ApiNode;

export interface ApiNodeDiscoverer {
	populateApiNodesFromConfiguration(): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	discoverNewApiNodes(): Promise<void>;
	refreshApiNodes(): Promise<void>;
}

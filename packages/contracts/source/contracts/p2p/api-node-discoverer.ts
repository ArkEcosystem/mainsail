import { Peer, ApiNode, PeerProtocol } from "./peer";

export type ApiNodeFactory = (ip: string, port: string | number, protocol?: PeerProtocol) => ApiNode;

export interface ApiNodeDiscoverer {
	populateApiNodesFromConfiguration(): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	discoverNewApiNodes(): Promise<void>;
	refreshApiNodes(): Promise<void>;
}

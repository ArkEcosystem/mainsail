import { Peer, PeerApiNode, PeerProtocol } from "./peer";

export type PeerApiNodeFactory = (ip: string, port: string | number, protocol?: PeerProtocol) => PeerApiNode;

export interface PeerApiNodeDiscoverer {
	populateApiNodesFromConfiguration(): Promise<void>;
	discoverApiNodes(peer: Peer): Promise<void>;
	discoverNewApiNodes(): Promise<void>;
	refreshApiNodes(): Promise<void>;
}

import { PeerApiNode } from "./peer";

export interface AcceptNewPeerApiNodeOptions {
	seed?: boolean;
}

export interface PeerApiNodeProcessor {
	validateAndAcceptApiNode(apiNode: PeerApiNode, options?: AcceptNewPeerApiNodeOptions): Promise<void>;
}

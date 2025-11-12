import type { Peer } from "./peer.js";

export interface AcceptNewPeerOptions {
	seed?: boolean;
}

export interface PeerProcessor {
	initialize(): void;

	validateAndAcceptPeer(ip: string, options?: AcceptNewPeerOptions): Promise<void>;

	validatePeerIp(ip: string, options?: AcceptNewPeerOptions): boolean;

	isWhitelisted(peer: Peer): boolean;
}

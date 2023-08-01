export interface AcceptNewPeerOptions {
	seed?: boolean;
}

export interface PeerProcessor {
	initialize();

	validateAndAcceptPeer(ip: string, options?: AcceptNewPeerOptions): Promise<void>;

	validatePeerIp(peer, options?: AcceptNewPeerOptions): boolean;

	isWhitelisted(peer): boolean;
}

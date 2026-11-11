export interface AcceptNewPeerOptions {
	seed?: boolean;
}

// Owns the acceptance of peers. Addresses learned from the seeds or from other peers are recorded as
// known through this method; connections are accepted and verified through the hooks the processor
// installs on the transport, so a peer becomes active only after a handshake and a verification.
export interface PeerProcessor {
	validateAndAcceptPeer(ip: string, options?: AcceptNewPeerOptions): Promise<void>;
}

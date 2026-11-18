// Owns the acceptance of peers. Addresses learned from other peers are handed to this method, which
// queues them for dialing and does not wait; connections, dialed or inbound, are accepted and verified
// through the hook the processor installs on the transport, so a peer becomes active only after a
// handshake and a verification. An address that does not answer leaves no trace.
export interface PeerProcessor {
	validateAndAcceptPeer(ip: string): void;
}

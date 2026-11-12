import type { Peer } from "./peer.js";

// Peers move between three disjoint lists: active (verified; the plain `getPeers` family), pending
// (open connection, verification running) and known (formerly active peers that lost their
// connection and are dialed again).
export interface PeerRepository {
	getPeers(): Peer[];
	hasPeers(): boolean;

	getPeer(ip: string): Peer;
	setPeer(peer: Peer): void;
	forgetPeer(peer: Peer): void;
	hasPeer(ip: string): boolean;

	getPendingPeers(): Peer[];
	hasPendingPeers(): boolean;

	getPendingPeer(ip: string): Peer;
	setPendingPeer(peer: Peer): void;
	forgetPendingPeer(peer: Peer): void;
	hasPendingPeer(ip: string): boolean;

	getKnownPeers(): Peer[];
	hasKnownPeers(): boolean;

	getKnownPeer(ip: string): Peer;
	setKnownPeer(peer: Peer): void;
	forgetKnownPeer(peer: Peer): void;
	hasKnownPeer(ip: string): boolean;

	// Removes the peer from whichever list holds it.
	removePeer(ip: string): void;

	// An active peer that lost its connection becomes known again, so it can be dialed later; a pending
	// one is dropped, it was never verified.
	demotePeer(ip: string): void;

	hasMinimumPeers(): boolean;

	getSameSubnetPeers(ip: string): Peer[];
}

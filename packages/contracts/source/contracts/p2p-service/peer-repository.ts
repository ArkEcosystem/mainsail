import type { Peer } from "./peer.js";

// Peers move between three disjoint lists: active (verified, the ones the node talks to), pending (open
// connection, verification running) and known (seeds and formerly active peers without a connection,
// dialed by the service loop).
export interface PeerRepository {
	// Any list.
	hasPeer(ip: string): boolean;

	getActivePeers(): Peer[];
	hasActivePeers(): boolean;

	getActivePeer(ip: string): Peer;
	setActivePeer(peer: Peer): void;
	forgetActivePeer(peer: Peer): void;
	hasActivePeer(ip: string): boolean;

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

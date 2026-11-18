import type { Peer } from "./peer.js";

// Peers are kept in three lists: active (verified, the ones the node talks to), pending (open connection,
// verification running) and known (seeds and formerly active peers, dialed by the service loop). A known
// peer stays known while it is pending and leaves the list only when it becomes active.
export interface PeerRepository {
	// Any list.
	hasPeer(ip: string): boolean;

	getActivePeers(): Peer[];
	hasActivePeers(): boolean;

	getActivePeer(ip: string): Peer;
	// Moves the peer here from the pending and known lists.
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

	// Removes the peer from every list.
	removePeer(ip: string): void;

	// An active peer that lost its connection becomes known again, so it can be dialed later; a pending
	// one only loses its pending entry, so it stays known if it was and is dropped otherwise.
	demotePeer(ip: string): void;

	// Whether there are at least `minimumNetworkReach` active peers; always true with a minimum of 0.
	hasMinimumPeers(): boolean;

	getSameSubnetPeers(ip: string): Peer[];
}

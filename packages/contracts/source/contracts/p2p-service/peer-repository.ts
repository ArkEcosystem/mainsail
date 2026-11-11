import type { Peer } from "./peer.js";

// Peers move between three disjoint lists: known (address only, no connection), pending (open
// connection, verification running) and active (verified; the plain `getPeers` family).
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

	hasMinimumPeers(): boolean;

	getSameSubnetPeers(ip: string): Peer[];
}

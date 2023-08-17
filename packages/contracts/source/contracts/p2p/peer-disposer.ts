import { Peer } from "./peer";

export interface PeerDisposer {
	banPeer(peer: Peer, reason: string): void;
	disposePeer(peer: Peer): void;
	isBanned(peerIp: string): boolean;
}

import { Peer } from "./peer";

export interface PeerBlocker {
	blockPeer(peer: Peer): void;
	disposePeer(peer: Peer): void;
	isBlocked(peerIp: string): boolean;
}

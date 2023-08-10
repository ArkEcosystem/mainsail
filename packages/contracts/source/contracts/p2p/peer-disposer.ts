import { Peer } from "./peer";

export interface PeerDisposer {
	blockPeer(peer: Peer, reason: string): void;
	disposePeer(peer: Peer): void;
	isBlocked(peerIp: string): boolean;
}

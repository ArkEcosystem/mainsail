import { Peer } from "./peer";

export interface PeerDisposer {
	blockPeer(peer: Peer): void;
	disposePeer(peer: Peer): void;
	isBlocked(peerIp: string): boolean;
}

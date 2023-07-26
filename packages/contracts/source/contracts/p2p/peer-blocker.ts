import { Peer } from "./peer";

export interface PeerBlocker {
	blockPeer(peer: Peer): void;
	isBlocked(peerIp: string): boolean;
}

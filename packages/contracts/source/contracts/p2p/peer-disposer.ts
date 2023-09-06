import { Peer } from "./peer";

export interface PeerDisposer {
	banPeer(peer: Peer, error: Error): void;
	disposePeer(peer: Peer): void;
	isBanned(peerIp: string): boolean;
}

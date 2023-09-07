import { NesError } from "./nes";
import { Peer } from "./peer";

export interface PeerDisposer {
	banPeer(peer: Peer, error: Error | NesError, checkRepository?: boolean): void;
	disposePeer(peer: Peer): void;
	isBanned(peerIp: string): boolean;
}

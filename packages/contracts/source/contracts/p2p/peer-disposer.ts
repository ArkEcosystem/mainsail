import { NesError } from "./nes";

export interface PeerDisposer {
	banPeer(ip: string, error: Error | NesError, checkRepository?: boolean): void;
	disposePeer(ip: string): void;
	disposePeers(): Promise<void>;
	isBanned(ip: string): boolean;
}

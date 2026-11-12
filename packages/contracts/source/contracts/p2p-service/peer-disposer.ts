export interface PeerDisposer {
	banPeer(ip: string, error: Error): void;
	disposePeer(ip: string): void;
	disposePeers(): Promise<void>;
	bannedPeers(): { ip: string; timeout: number }[];
}

import { Contracts } from "@arkecosystem/core-contracts";
import { PeerRepository } from "@arkecosystem/core-p2p";

let mockPeers: Contracts.P2P.Peer[] = [];

export const setPeers = (peers: Contracts.P2P.Peer[]) => {
	mockPeers = peers;
};

class PeerRepositoryMock implements Partial<PeerRepository> {
	public getPeers(): Contracts.P2P.Peer[] {
		return mockPeers;
	}

	public hasPeer(ip: string): boolean {
		return mockPeers.length > 0;
	}

	public getPeer(ip: string): Contracts.P2P.Peer {
		return mockPeers[0];
	}
}

export const instance = new PeerRepositoryMock();

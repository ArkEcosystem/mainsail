import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class PeerRepository implements Contracts.TransactionPool.PeerRepository {
	@inject(Identifiers.TransactionPool.Peer.Factory)
	private readonly peerFactor!: Contracts.TransactionPool.PeerFactory;

	readonly #peers: Map<string, Contracts.TransactionPool.Peer> = new Map();

	public getPeers(): Contracts.TransactionPool.Peer[] {
		return [...this.#peers.values()];
	}

	public getPeer(ip: string): Contracts.TransactionPool.Peer {
		const peer = this.#peers.get(ip);

		Utils.assert.defined<Contracts.TransactionPool.Peer>(peer);

		return peer;
	}

	public setPeer(ip: string): void {
		this.#peers.set(ip, this.peerFactor(ip));
	}

	public forgetPeer(ip: string): void {
		this.#peers.delete(ip);
	}

	public hasPeer(ip: string): boolean {
		return this.#peers.has(ip);
	}
}

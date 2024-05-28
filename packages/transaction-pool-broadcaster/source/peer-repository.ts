import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class PeerRepository implements Contracts.TransactionPool.PeerRepository {
	readonly #peers: Map<string, Contracts.TransactionPool.Peer> = new Map();
	readonly #peersPending: Map<string, Contracts.TransactionPool.Peer> = new Map();

	public getPeers(): Contracts.TransactionPool.Peer[] {
		return [...this.#peers.values()];
	}

	public getPeer(ip: string): Contracts.TransactionPool.Peer {
		const peer = this.#peers.get(ip);

		Utils.assert.defined<Contracts.TransactionPool.Peer>(peer);

		return peer;
	}

	public setPeer(peer: Contracts.TransactionPool.Peer): void {
		this.#peers.set(peer.ip, peer);
	}

	public forgetPeer(peer: Contracts.TransactionPool.Peer): void {
		this.#peers.delete(peer.ip);
	}

	public hasPeer(ip: string): boolean {
		return this.#peers.has(ip);
	}

	public getPendingPeers(): Contracts.TransactionPool.Peer[] {
		return [...this.#peersPending.values()];
	}

	public hasPendingPeers(): boolean {
		return this.#peersPending.size > 0;
	}

	public getPendingPeer(ip: string): Contracts.TransactionPool.Peer {
		const peer = this.#peersPending.get(ip);

		Utils.assert.defined<Contracts.TransactionPool.Peer>(peer);

		return peer;
	}

	public setPendingPeer(peer: Contracts.TransactionPool.Peer): void {
		this.#peersPending.set(peer.ip, peer);
	}

	public forgetPendingPeer(peer: Contracts.TransactionPool.Peer): void {
		this.#peersPending.delete(peer.ip);
	}

	public hasPendingPeer(ip: string): boolean {
		return this.#peersPending.has(ip);
	}
}

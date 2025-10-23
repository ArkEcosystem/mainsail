import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";


@injectable()
export class PeerStatistic implements Contracts.P2P.PeerStatistic {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;


	public async logStatistic(): Promise<void> {
		let statistic = "";

		const peers = this.peerRepository.getPeers();
		statistic += `Peers: ${peers.length}, `;
		statistic += `Banned Peers: ${this.peerDisposer.bannedPeers().length}, `;

		statistic += `Latency: `;
		statistic += `Average: ${this.#getAverageLatency(peers).toFixed(0)} ms, `;
		statistic += `Median: ${this.#getMedianLatency(peers).toFixed(0)} ms, `;
		statistic += `Best: ${this.#getBestLatencies(peers, 3).map((latency) => latency).join(", ")} ms, `;
		statistic += `Worst: ${this.#getWorstLatencies(peers, 3).map((latency) => latency).join(", ")} ms`;


		this.logger.debug(statistic, "p2p");
	}

	#getLatencies(peers: Contracts.P2P.Peer[]): number[] {
		return peers
			.map((peer) => peer.latency)
			.filter((latency): latency is number => latency !== undefined)
			.sort((a, b) => a - b);
	}

	#getAverageLatency(peers: Contracts.P2P.Peer[]): number {
		const latencies = this.#getLatencies(peers);

		if (latencies.length === 0) {
			return 0;
		}

		const totalLatency = latencies.reduce((sum, latency) => sum + latency, 0);
		return totalLatency / latencies.length;
	}

	#getMedianLatency(peers: Contracts.P2P.Peer[]): number {
		const latencies = this.#getLatencies(peers);

		if (latencies.length === 0) {
			return 0;
		}

		const middle = Math.floor(latencies.length / 2);
		if (latencies.length % 2 === 0) {
			return (latencies[middle - 1] + latencies[middle]) / 2;
		} else {
			return latencies[middle];
		}
	}

	#getBestLatencies(peers: Contracts.P2P.Peer[], count: number): number[] {
		const latencies = this.#getLatencies(peers);
		return latencies.slice(0, count);
	}

	#getWorstLatencies(peers: Contracts.P2P.Peer[], count: number): number[] {
		const latencies = this.#getLatencies(peers);
		return latencies.slice(-count);
	}
}

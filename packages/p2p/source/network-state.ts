import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { NetworkStateStatus } from "./enums";

class QuorumDetails {
	public peersQuorum = 0;

	public peersNoQuorum = 0;

	public peersOverHeight = 0;

	public peersOverHeightBlockHeaders: { [id: string]: any } = {};

	public peersForked = 0;

	public peersForgingNotAllowed = 0;

	public getQuorum() {
		const quorum = this.peersQuorum / (this.peersQuorum + this.peersNoQuorum);

		return isFinite(quorum) ? quorum : 0;
	}
}

// @TODO review the implementation
export class NetworkState implements Contracts.P2P.NetworkState {
	#nodeHeight?: number;
	#lastBlockId?: string;
	#quorumDetails: QuorumDetails;

	public constructor(public readonly status: NetworkStateStatus, lastBlock?: Contracts.Crypto.IBlock) {
		this.#quorumDetails = new QuorumDetails();

		if (lastBlock) {
			this.#setLastBlock(lastBlock);
		}
	}

	public static async analyze(
		monitor: Contracts.P2P.NetworkMonitor,
		repository: Contracts.P2P.PeerRepository,
	): Promise<Contracts.P2P.NetworkState> {
		// @ts-ignore - app exists but isn't on the interface for now
		const lastBlock: Contracts.Crypto.IBlock = monitor.app.get<any>(Identifiers.BlockchainService).getLastBlock();

		const peers: Contracts.P2P.Peer[] = repository.getPeers();
		// @ts-ignore - app exists but isn't on the interface for now
		const configuration = monitor.app.getTagged<Providers.PluginConfiguration>(
			Identifiers.PluginConfiguration,
			"plugin",
			"p2p",
		);
		const minimumNetworkReach = configuration.getRequired<number>("minimumNetworkReach");

		if (monitor.isColdStart()) {
			monitor.completeColdStart();
			return new NetworkState(NetworkStateStatus.ColdStart, lastBlock);
		} else if (process.env[Constants.Flags.CORE_ENV] === "test") {
			return new NetworkState(NetworkStateStatus.Test, lastBlock);
		} else if (peers.length < minimumNetworkReach) {
			return new NetworkState(NetworkStateStatus.BelowMinimumPeers, lastBlock);
		}

		return this.#analyzeNetwork(lastBlock, peers);
	}

	public static parse(data: any): Contracts.P2P.NetworkState {
		if (!data || data.status === undefined) {
			return new NetworkState(NetworkStateStatus.Unknown);
		}

		const networkState = new NetworkState(data.status);
		networkState.#nodeHeight = data.nodeHeight;
		networkState.#lastBlockId = data.lastBlockId;
		Object.assign(networkState.#quorumDetails, data.quorumDetails);

		return networkState;
	}

	static #analyzeNetwork(lastBlock, peers: Contracts.P2P.Peer[]): Contracts.P2P.NetworkState {
		const networkState = new NetworkState(NetworkStateStatus.Default, lastBlock);

		for (const peer of peers) {
			networkState.#update(peer);
		}

		return networkState;
	}

	public getNodeHeight(): number | undefined {
		return this.#nodeHeight;
	}

	public getLastBlockId(): string | undefined {
		return this.#lastBlockId;
	}

	public getQuorum(): number {
		if (this.status === NetworkStateStatus.Test) {
			return 1;
		}

		return this.#quorumDetails.getQuorum();
	}

	public getOverHeightBlockHeaders(): { [id: string]: any } {
		return Object.values(this.#quorumDetails.peersOverHeightBlockHeaders);
	}

	public toJson(): string {
		const data = {
			lastBlockId: this.#lastBlockId,
			nodeHeight: this.#nodeHeight,
			quorum: this.getQuorum(),
			quorumDetails: this.#quorumDetails,
		};

		return JSON.stringify(data, undefined, 2);
	}

	#setLastBlock(lastBlock: Contracts.Crypto.IBlock): void {
		this.#nodeHeight = lastBlock.data.height;
		this.#lastBlockId = lastBlock.data.id;
	}

	#update(peer: Contracts.P2P.Peer): void {
		Utils.assert.defined<number>(peer.state.height);
		Utils.assert.defined<number>(this.#nodeHeight);
		if (peer.state.height > this.#nodeHeight) {
			this.#quorumDetails.peersNoQuorum++;
			this.#quorumDetails.peersOverHeight++;
			this.#quorumDetails.peersOverHeightBlockHeaders[peer.state.header.id] = peer.state.header;
		} else {
			if (peer.isForked()) {
				this.#quorumDetails.peersNoQuorum++;
				this.#quorumDetails.peersForked++;
			} else {
				this.#quorumDetails.peersQuorum++;
			}
		}

		if (!peer.state.forgingAllowed) {
			this.#quorumDetails.peersForgingNotAllowed++;
		}
	}
}

import Interfaces, { IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Providers, Utils } from "@arkecosystem/core-kernel";

import { NetworkStateStatus } from "./enums";

class QuorumDetails {
	public peersQuorum = 0;

	public peersNoQuorum = 0;

	public peersOverHeight = 0;

	public peersOverHeightBlockHeaders: { [id: string]: any } = {};

	public peersForked = 0;

	public peersDifferentSlot = 0;

	public peersForgingNotAllowed = 0;

	public getQuorum() {
		const quorum = this.peersQuorum / (this.peersQuorum + this.peersNoQuorum);

		/* istanbul ignore next */
		return isFinite(quorum) ? quorum : 0;
	}
}

// todo: review the implementation
export class NetworkState implements Contracts.P2P.NetworkState {
	private nodeHeight?: number;
	private lastBlockId?: string;
	private quorumDetails: QuorumDetails;

	public constructor(public readonly status: NetworkStateStatus, lastBlock?: Interfaces.IBlock) {
		this.quorumDetails = new QuorumDetails();

		if (lastBlock) {
			this.setLastBlock(lastBlock);
		}
	}

	public static async analyze(
		monitor: Contracts.P2P.NetworkMonitor,
		repository: Contracts.P2P.PeerRepository,
		cryptoConfiguration: IConfiguration,
		slots,
	): Promise<Contracts.P2P.NetworkState> {
		// @ts-ignore - app exists but isn't on the interface for now
		const lastBlock: Interfaces.IBlock = monitor.app
			.get<any>(Container.Identifiers.BlockchainService)
			.getLastBlock();

		const blockTimeLookup = await Utils.forgingInfoCalculator.getBlockTimeLookup(
			// @ts-ignore - app exists but isn't on the interface for now
			monitor.app,
			lastBlock.data.height,
			cryptoConfiguration,
		);

		const peers: Contracts.P2P.Peer[] = repository.getPeers();
		// @ts-ignore - app exists but isn't on the interface for now
		const configuration = monitor.app.getTagged<Providers.PluginConfiguration>(
			Container.Identifiers.PluginConfiguration,
			"plugin",
			"core-p2p",
		);
		const minimumNetworkReach = configuration.getOptional<number>("minimumNetworkReach", 20);

		if (monitor.isColdStart()) {
			monitor.completeColdStart();
			return new NetworkState(NetworkStateStatus.ColdStart, lastBlock);
		} else if (process.env.CORE_ENV === "test") {
			return new NetworkState(NetworkStateStatus.Test, lastBlock);
		} else if (peers.length < minimumNetworkReach) {
			return new NetworkState(NetworkStateStatus.BelowMinimumPeers, lastBlock);
		}

		return this.analyzeNetwork(lastBlock, peers, blockTimeLookup, slots);
	}

	public static parse(data: any): Contracts.P2P.NetworkState {
		if (!data || data.status === undefined) {
			return new NetworkState(NetworkStateStatus.Unknown);
		}

		const networkState = new NetworkState(data.status);
		networkState.nodeHeight = data.nodeHeight;
		networkState.lastBlockId = data.lastBlockId;
		Object.assign(networkState.quorumDetails, data.quorumDetails);

		return networkState;
	}

	private static analyzeNetwork(
		lastBlock,
		peers: Contracts.P2P.Peer[],
		getTimeStampForBlock: (height: number) => number,
		slots,
	): Contracts.P2P.NetworkState {
		const networkState = new NetworkState(NetworkStateStatus.Default, lastBlock);
		const currentSlot = slots.getSlotNumber(getTimeStampForBlock);

		for (const peer of peers) {
			networkState.update(peer, currentSlot);
		}

		return networkState;
	}

	public getNodeHeight(): number | undefined {
		return this.nodeHeight;
	}

	public getLastBlockId(): string | undefined {
		return this.lastBlockId;
	}

	public getQuorum(): number {
		if (this.status === NetworkStateStatus.Test) {
			return 1;
		}

		return this.quorumDetails.getQuorum();
	}

	public getOverHeightBlockHeaders(): { [id: string]: any } {
		return Object.values(this.quorumDetails.peersOverHeightBlockHeaders);
	}

	public toJson(): string {
		const data = { quorum: this.getQuorum() } as any;
		Object.assign(data, this);
		delete data.status;

		return JSON.stringify(data, undefined, 2);
	}

	private setLastBlock(lastBlock: Interfaces.IBlock): void {
		this.nodeHeight = lastBlock.data.height;
		this.lastBlockId = lastBlock.data.id;
	}

	private update(peer: Contracts.P2P.Peer, currentSlot: number): void {
		Utils.assert.defined<number>(peer.state.height);
		Utils.assert.defined<number>(this.nodeHeight);
		if (peer.state.height > this.nodeHeight) {
			this.quorumDetails.peersNoQuorum++;
			this.quorumDetails.peersOverHeight++;
			this.quorumDetails.peersOverHeightBlockHeaders[peer.state.header.id] = peer.state.header;
		} else {
			if (peer.isForked()) {
				this.quorumDetails.peersNoQuorum++;
				this.quorumDetails.peersForked++;
			} else {
				this.quorumDetails.peersQuorum++;
			}
		}

		// Just statistics in case something goes wrong.
		if (peer.state.currentSlot !== currentSlot) {
			this.quorumDetails.peersDifferentSlot++;
		}

		if (!peer.state.forgingAllowed) {
			this.quorumDetails.peersForgingNotAllowed++;
		}
	}
}

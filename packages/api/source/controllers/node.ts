import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import Hapi from "@hapi/hapi";

import { Controller } from "./controller";

@injectable()
export class NodeController extends Controller {
	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async status(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const lastBlock = this.blockchain.getLastBlock();
		const networkHeight = this.networkMonitor.getNetworkHeight();

		return {
			data: {
				blocksCount: networkHeight && lastBlock ? networkHeight - lastBlock.data.height : 0,
				now: lastBlock ? lastBlock.data.height : 0,
				synced: this.blockchain.isSynced(),
				// timestamp: Crypto.Slots.getTime(),
			},
		};
	}

	public async syncing(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const lastBlock = this.blockchain.getLastBlock();
		const networkHeight = this.networkMonitor.getNetworkHeight();

		return {
			data: {
				blocks: networkHeight && lastBlock ? networkHeight - lastBlock.data.height : 0,
				height: lastBlock ? lastBlock.data.height : 0,
				id: lastBlock?.data?.id,
				syncing: !this.blockchain.isSynced(),
			},
		};
	}

	public async configurationNode(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const network = this.configuration.all().network;

		return {
			data: {
				constants: this.configuration.getMilestone(this.blockchain.getLastHeight()),
				core: {
					version: this.app.version(),
				},
				explorer: network.client.explorer,
				nethash: network.nethash,
				// ports: super.toResource(this.configRepository, PortsResource),
				slip44: network.slip44,
				symbol: network.client.symbol,
				token: network.client.token,
				// transactionPool: {
				// 	dynamicFees: dynamicFees.enabled ? dynamicFees : { enabled: false },
				// 	maxTransactionAge: this.transactionPoolConfiguration.getRequired<number>("maxTransactionAge"),
				// 	maxTransactionBytes: this.transactionPoolConfiguration.getRequired<number>("maxTransactionBytes"),
				// 	maxTransactionsInPool:
				// 		this.transactionPoolConfiguration.getRequired<number>("maxTransactionsInPool"),
				// 	maxTransactionsPerRequest:
				// 		this.transactionPoolConfiguration.getRequired<number>("maxTransactionsPerRequest"),
				// 	maxTransactionsPerSender:
				// 		this.transactionPoolConfiguration.getRequired<number>("maxTransactionsPerSender"),
				// },
				version: network.pubKeyHash,
				wif: network.wif,
			},
		};
	}

	public async configurationCrypto() {
		return {
			data: this.configuration.all(),
		};
	}
}

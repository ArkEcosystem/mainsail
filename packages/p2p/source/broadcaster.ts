import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { PeerCommunicator } from "./peer-communicator";

@injectable()
export class Broadcaster implements Contracts.P2P.Broadcaster {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.ITransactionSerializer;

	public async broadcastTransactions(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		if (transactions.length === 0) {
			this.logger.warning("Broadcasting 0 transactions");
			return;
		}

		const maxPeersBroadcast: number = this.configuration.getRequired<number>("maxPeersBroadcast");
		const peers: Contracts.P2P.Peer[] = Utils.take(Utils.shuffle(this.repository.getPeers()), maxPeersBroadcast);

		const transactionsString = Utils.pluralize("transaction", transactions.length, true);
		const peersString = Utils.pluralize("peer", peers.length, true);
		this.logger.debug(`Broadcasting ${transactionsString} to ${peersString}`);

		const transactionsBroadcast: Buffer[] = [];
		for (const transaction of transactions) {
			transactionsBroadcast.push(await this.serializer.serialize(transaction));
		}

		const promises = peers.map((p) => this.communicator.postTransactions(p, transactionsBroadcast));

		await Promise.all(promises);
	}

	public async broadcastBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		const blockchain = this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService);

		let blockPing = blockchain.getBlockPing();
		let peers: Contracts.P2P.Peer[] = this.repository.getPeers();

		if (blockPing && blockPing.block.id === block.data.id && !blockPing.fromForger) {
			// wait a bit before broadcasting if a bit early
			const diff = blockPing.last - blockPing.first;
			const maxHop = 4;
			let broadcastQuota: number = (maxHop - blockPing.count) / maxHop;

			if (diff < 500 && broadcastQuota > 0) {
				await Utils.sleep(500 - diff);

				blockPing = blockchain.getBlockPing()!;

				// got aleady a new block, no broadcast
				if (blockPing.block.height !== block.data.height) {
					return;
				}

				broadcastQuota = (maxHop - blockPing.count) / maxHop;
			}

			peers = broadcastQuota <= 0 ? [] : Utils.shuffle(peers).slice(0, Math.ceil(broadcastQuota * peers.length));
			// select a portion of our peers according to quota calculated before
		}

		this.logger.info(
			`Broadcasting block ${block.data.height.toLocaleString()} to ${Utils.pluralize(
				"peer",
				peers.length,
				true,
			)}`,
		);

		await Promise.all(peers.map((peer) => this.communicator.postBlock(peer, block)));
	}
}

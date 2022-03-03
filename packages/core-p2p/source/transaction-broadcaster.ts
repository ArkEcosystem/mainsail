import { inject, injectable, tagged } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Utils } from "@arkecosystem/core-kernel";

import { PeerCommunicator } from "./peer-communicator";

@injectable()
export class TransactionBroadcaster implements Contracts.P2P.TransactionBroadcaster {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Crypto.ITransactionSerializer;

	public async broadcastTransactions(transactions: Crypto.ITransaction[]): Promise<void> {
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
}

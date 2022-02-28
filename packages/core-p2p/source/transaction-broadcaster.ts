import Interfaces, { BINDINGS, ITransactionSerializer } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Providers, Utils } from "@arkecosystem/core-kernel";

import { PeerCommunicator } from "./peer-communicator";

@Container.injectable()
export class TransactionBroadcaster implements Contracts.P2P.TransactionBroadcaster {
	@Container.inject(Container.Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@Container.inject(Container.Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@Container.inject(Container.Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@Container.inject(BINDINGS.Transaction.Serializer)
	private readonly serializer!: ITransactionSerializer;

	public async broadcastTransactions(transactions: Interfaces.ITransaction[]): Promise<void> {
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

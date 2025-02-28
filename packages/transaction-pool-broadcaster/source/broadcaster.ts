import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { shuffle, take } from "@mainsail/utils";

@injectable()
export class Broadcaster implements Contracts.TransactionPool.Broadcaster {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-broadcaster")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	@inject(Identifiers.TransactionPool.Peer.Communicator)
	private readonly communicator!: Contracts.TransactionPool.PeerCommunicator;

	async broadcastTransactions(transactions: Contracts.Crypto.Transaction[]): Promise<void> {
		const promises = this.#getPeersForBroadcast().map((peer) =>
			this.communicator.postTransactions(peer, transactions),
		);

		await Promise.all(promises);
	}

	#getPeersForBroadcast(): Contracts.TransactionPool.Peer[] {
		const maxPeersBroadcast: number = this.configuration.getRequired<number>("maxPeersBroadcast");
		return take(shuffle(this.repository.getPeers()), maxPeersBroadcast);
	}
}

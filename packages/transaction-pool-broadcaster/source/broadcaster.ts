import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

@injectable()
export class Broadcaster implements Contracts.TransactionPool.Broadcaster {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-broadcaster")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	@inject(Identifiers.TransactionPool.Peer.Communicator)
	private readonly communicator!: Contracts.TransactionPool.PeerCommunicator;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	async broadcastTransactions(transactions: Contracts.Crypto.Transaction[]): Promise<void> {
		this.state.resetLastMessageTime();

		const promises = this.#getPeersForBroadcast().map((peer) =>
			this.communicator.postTransactions(peer, transactions),
		);

		await Promise.all(promises);
	}

	#getPeersForBroadcast(): Contracts.TransactionPool.Peer[] {
		const maxPeersBroadcast: number = this.configuration.getRequired<number>("maxPeersBroadcast");
		return Utils.take(Utils.shuffle(this.repository.getPeers()), maxPeersBroadcast);
	}
}

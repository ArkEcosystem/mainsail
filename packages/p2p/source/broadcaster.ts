import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

@injectable()
export class Broadcaster implements Contracts.P2P.Broadcaster {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.ITransactionSerializer;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	public async broadcastTransactions(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		if (transactions.length === 0) {
			this.logger.warning("Broadcasting 0 transactions");
			return;
		}

		const peers = this.#getPeersForBroadcast();
		this.logger.debug(
			`Broadcasting ${Utils.pluralize("transaction", transactions.length, true)} to ${Utils.pluralize(
				"peer",
				peers.length,
				true,
			)}`,
		);

		const transactionsBroadcast: Buffer[] = [];
		for (const transaction of transactions) {
			transactionsBroadcast.push(await this.serializer.serialize(transaction));
		}

		const promises = peers.map((p) => this.communicator.postTransactions(p, transactionsBroadcast));

		await Promise.all(promises);
	}

	async broadcastProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		this.state.resetLastMessageTime();

		const promises = this.#getPeersForBroadcast().map((peer) =>
			this.communicator.postProposal(peer, proposal.serialized),
		);

		await Promise.all(promises);
	}

	public async broadcastPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
		this.state.resetLastMessageTime();

		const promises = this.#getPeersForBroadcast().map((peer) =>
			this.communicator.postPrevote(peer, prevote.serialized),
		);

		await Promise.all(promises);
	}

	async broadcastPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
		this.state.resetLastMessageTime();

		const promises = this.#getPeersForBroadcast().map((peer) =>
			this.communicator.postPrecommit(peer, precommit.serialized),
		);

		await Promise.all(promises);
	}

	#getPeersForBroadcast(): Contracts.P2P.Peer[] {
		const maxPeersBroadcast: number = this.configuration.getRequired<number>("maxPeersBroadcast");
		const peers: Contracts.P2P.Peer[] = Utils.take(Utils.shuffle(this.repository.getPeers()), maxPeersBroadcast);

		return peers;
	}
}

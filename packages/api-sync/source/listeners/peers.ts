import { Enums } from "@mainsail/kernel";
import { inject, injectable } from "@mainsail/container";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import * as ApiSyncContracts from "../contracts";

@injectable()
export class Peers implements ApiSyncContracts.EventListener {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.IPeerRepositoryFactory;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#flushInterval?: NodeJS.Timeout;
	#addedPeers: Map<string, Contracts.P2P.Peer> = new Map();
	#removedPeers: Map<string, Contracts.P2P.Peer> = new Map();

	public async boot(): Promise<void> {
		await this.#truncate();

		this.events.listen(Enums.PeerEvent.Added, this);
		this.events.listen(Enums.PeerEvent.Removed, this);

		const syncInterval = this.configuration.getMilestone().blockTime * 2;

		this.#flushInterval = setInterval(async () => {
			await this.#flushToDatabase();
		}, syncInterval);
	}

	public async dispose(): Promise<void> {
		this.events.forget(Enums.PeerEvent.Added, this);
		this.events.forget(Enums.PeerEvent.Removed, this);

		if (this.#flushInterval) {
			clearInterval(this.#flushInterval);
		}
	}

	public async handle({ name, data }: { name: Contracts.Kernel.EventName; data: Contracts.P2P.Peer; }): Promise<void> {
		switch (name) {
			case Enums.PeerEvent.Added: {
				await this.#handleAddedPeer(data);
				break;
			}
			case Enums.PeerEvent.Removed: {
				await this.#handleRemovedPeer(data);
				break;
			}
			default: throw new Exceptions.NotImplemented("Peers.handle", name.toString());
		}
	}

	async #handleAddedPeer(peer: Contracts.P2P.Peer): Promise<void> {
		if (this.#removedPeers.has(peer.ip)) {
			this.#removedPeers.delete(peer.ip);
		}

		this.#addedPeers.set(peer.ip, peer);
	}

	async  #handleRemovedPeer(peer: Contracts.P2P.Peer): Promise<void> {
		if (this.#addedPeers.has(peer.ip)) {
			this.#addedPeers.delete(peer.ip);
		}

		this.#removedPeers.set(peer.ip, peer);
	}

	async #flushToDatabase(): Promise<void> {
		this.logger.debug(`flushing peers to database (added: ${this.#addedPeers.size} removed: ${this.#removedPeers.size}))`);

		const addedPeers = [...this.#addedPeers.values()];
		const removedPeers = [...this.#removedPeers.values()];

		if (removedPeers.length === 0 && addedPeers.length === 0) {
			return;
		}

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const peerRepository = this.peerRepositoryFactory(entityManager);

			if (removedPeers.length > 0) {
				await peerRepository.delete(removedPeers.map(({ ip }) => ip));
			}

			if (this.#addedPeers.size > 0) {
				await peerRepository.upsert(
					[...this.#addedPeers.values()].map(peer => ({
						ip: peer.ip,
						port: peer.port,
						latency: peer.latency,
						version: peer.version,
						ports: peer.ports as Record<string, any>,
						plugins: peer.plugins as Record<string, any>,
					})),
					["ip"]
				);
			}

			this.#addedPeers.clear();
			this.#removedPeers.clear();
		});
	}


	async #truncate(): Promise<void> {
		await this.peerRepositoryFactory(this.dataSource).clear();
	}

}

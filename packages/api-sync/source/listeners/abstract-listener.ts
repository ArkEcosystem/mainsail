import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	TypeOrm,
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { NotImplemented } from "@mainsail/exceptions";

import { EventListener } from "../contracts.js";

export enum ListenerEvent {
	OnAdded,
	OnRemoved,
}

export type ListenerEventMapping = { [key: string]: ListenerEvent };

@injectable()
export abstract class AbstractListener<TEventData, TEntity extends object> implements EventListener {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	protected readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(Identifiers.Services.EventDispatcher.Service)
	protected readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.ApiSync.Logger)
	protected readonly logger!: Contracts.ApiSync.Logger;

	#syncTimeout?: NodeJS.Timeout;
	#addedEvents: Map<string, TEventData> = new Map();
	#removedEvents: Map<string, TEventData> = new Map();

	public async register(): Promise<void> {
		for (const eventName of Object.keys(this.getEventMapping())) {
			this.events.listen(eventName, this);
		}
	}

	public async boot(): Promise<void> {
		await this.#truncate();

		void this.#startSyncLoop();
	}

	async #startSyncLoop(): Promise<void> {
		const syncInterval = this.getSyncIntervalMs();

		const run = async () => {
			try {
				await this.#syncToDatabaseTransaction();
			} catch (ex) {
				this.logger.error(`#syncToDatabaseTransaction failed: ${ex}`);
			} finally {
				this.#syncTimeout = setTimeout(() => {
					void run();
				}, syncInterval);
			}
		};

		void run();
	}

	public async dispose(): Promise<void> {
		for (const eventName of Object.keys(this.getEventMapping())) {
			this.events.forget(eventName, this);
		}

		if (this.#syncTimeout) {
			clearTimeout(this.#syncTimeout);
		}
	}

	public async flush(entityManager: TypeOrm.EntityManager): Promise<void> {
		const { added, removed } = this.#collectedEvents();

		if (removed.length === 0 && added.length === 0) {
			return;
		}

		await this.#syncToDatabase(entityManager, added, removed);
	}

	protected getSyncIntervalMs(): number {
		return this.pluginConfiguration.getRequired<number>("syncInterval");
	}

	protected abstract getEventMapping(): ListenerEventMapping;
	protected abstract getEventId(event: TEventData): string;
	protected abstract mapEventToEntity(event: TEventData): TEntity;
	protected abstract makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): TypeOrm.Repository<TEntity>;

	public async handle({ name, data }: { name: string; data: TEventData }): Promise<void> {
		const eventMapping = this.getEventMapping();

		switch (eventMapping[name]) {
			case ListenerEvent.OnAdded: {
				await this.#handleAddedEvent(data);
				break;
			}
			case ListenerEvent.OnRemoved: {
				await this.#handleRemovedEvent(data);
				break;
			}
			default: {
				throw new NotImplemented("handle", name.toString());
			}
		}
	}

	async #handleAddedEvent(event: TEventData): Promise<void> {
		const id = this.getEventId(event);
		if (this.#removedEvents.has(id)) {
			this.#removedEvents.delete(id);
		}

		this.#addedEvents.set(id, event);
	}

	async #handleRemovedEvent(event: TEventData): Promise<void> {
		const id = this.getEventId(event);
		if (this.#addedEvents.has(id)) {
			this.#addedEvents.delete(id);
		}

		this.#removedEvents.set(id, event);
	}

	async #syncToDatabaseTransaction(): Promise<void> {
		const { added, removed } = this.#collectedEvents();

		if (removed.length === 0 && added.length === 0) {
			return;
		}

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			await this.#syncToDatabase(entityManager, added, removed);
		});
	}

	async #syncToDatabase(
		entityManager: TypeOrm.EntityManager,
		added: TEventData[],
		removed: TEventData[],
	): Promise<void> {
		const entityRepository = this.makeEntityRepository(entityManager);

		this.logger.debug(
			`syncing ${entityRepository.metadata.tableNameWithoutPrefix} to database (added: ${added.length} removed: ${removed.length}))`,
		);

		if (removed.length > 0) {
			const eventIds = removed.map((event) => this.getEventId(event));
			await entityRepository.delete(eventIds);
			for (const eventId of eventIds) {
				this.#removedEvents.delete(eventId);
			}
		}

		if (added.length > 0) {
			await entityRepository.upsert(
				added.map((event) => this.mapEventToEntity(event) as unknown as object),
				entityRepository.metadata.primaryColumns.map((c) => c.propertyName),
			);

			for (const event of added) {
				this.#addedEvents.delete(this.getEventId(event));
			}
		}
	}

	async #truncate(): Promise<void> {
		await this.makeEntityRepository(this.dataSource).clear();
	}

	#collectedEvents(): { added: TEventData[]; removed: TEventData[] } {
		const added = [...this.#addedEvents.values()];
		const removed = [...this.#removedEvents.values()];
		return { added, removed };
	}
}

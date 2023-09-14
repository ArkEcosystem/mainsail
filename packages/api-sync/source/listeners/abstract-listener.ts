import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { EventListener } from "../contracts";

export enum ListenerEvent {
    OnAdded,
    OnRemoved,
}

export type ListenerEventMapping = { [key: Contracts.Kernel.EventName]: ListenerEvent };

@injectable()
export abstract class AbstractListener<TEventData, TEntity extends { [key: string]: any; }> implements EventListener {
    @inject(Identifiers.Cryptography.Configuration)
    protected readonly configuration!: Contracts.Crypto.IConfiguration;

    @inject(ApiDatabaseIdentifiers.DataSource)
    protected readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

    @inject(Identifiers.EventDispatcherService)
    protected readonly events!: Contracts.Kernel.EventDispatcher;

    @inject(Identifiers.LogService)
    protected readonly logger!: Contracts.Kernel.Logger;

    #syncInterval?: NodeJS.Timeout;
    #addedEvents: Map<string, TEventData> = new Map();
    #removedEvents: Map<string, TEventData> = new Map();

    public async boot(): Promise<void> {
        await this.#truncate();

        for (const eventName of Object.keys(this.getEventMapping())) {
            this.events.listen(eventName, this);
        }

        const syncInterval = this.getSyncIntervalMs();

        this.#syncInterval = setInterval(async () => {
            await this.#syncToDatabase();
        }, syncInterval);
    }

    public async dispose(): Promise<void> {
        for (const eventName of Object.keys(this.getEventMapping())) {
            this.events.forget(eventName, this);
        }

        if (this.#syncInterval) {
            clearInterval(this.#syncInterval);
        }
    }

    protected abstract getEventMapping(): ListenerEventMapping;
    protected abstract getEventId(event: TEventData): string;
    protected abstract getSyncIntervalMs(): number;
    protected abstract mapEventToEntity(event: TEventData): TEntity;
    protected abstract makeEntityRepository(dataSource: ApiDatabaseContracts.RepositoryDataSource): ApiDatabaseContracts.Repository<TEntity>;

    public async handle({ name, data }: { name: Contracts.Kernel.EventName; data: TEventData }): Promise<void> {
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
            default:
                throw new Exceptions.NotImplemented("handle", name.toString());
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

    async #syncToDatabase(): Promise<void> {
        const addedEvents = [...this.#addedEvents.values()];
        const removedEvents = [...this.#removedEvents.values()];

        if (removedEvents.length === 0 && addedEvents.length === 0) {
            return;
        }

        await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
            const entityRepository = this.makeEntityRepository(entityManager);

            this.logger.debug(
                `syncing ${entityRepository.metadata.tableNameWithoutPrefix} to database (added: ${this.#addedEvents.size} removed: ${this.#removedEvents.size}))`,
            );

            if (removedEvents.length > 0) {
                const eventIds = removedEvents.map(event => this.getEventId(event));
                await entityRepository.delete(eventIds);
                eventIds.forEach(eventId => this.#removedEvents.delete(eventId));
            }

            if (addedEvents.length > 0) {
                await entityRepository.upsert(
                    [...this.#addedEvents.values()].map((event) => this.mapEventToEntity(event)),
                    entityRepository.metadata.primaryColumns.map(c => c.propertyName),
                );

                addedEvents.forEach(event => this.#addedEvents.delete(this.getEventId(event)));
            }
        });
    }

    async #truncate(): Promise<void> {
        await this.makeEntityRepository(this.dataSource).clear();
    }
}

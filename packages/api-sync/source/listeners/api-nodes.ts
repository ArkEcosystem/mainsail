import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener.js";

@injectable()
export class ApiNodes extends AbstractListener<Contracts.P2P.ApiNode, Models.ApiNode> {
	@inject(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory)
	private readonly apiNodeRepositoryFactory!: ApiDatabaseContracts.ApiNodeRepositoryFactory;

	protected getEventMapping(): ListenerEventMapping {
		return {
			[Enums.ApiNodeEvent.Added]: ListenerEvent.OnAdded,
			[Enums.ApiNodeEvent.Removed]: ListenerEvent.OnRemoved,
		};
	}

	protected getEventId(event: Contracts.P2P.ApiNode): string {
		const url = event.url;
		return url;
	}

	protected getSyncIntervalMs(): number {
		return this.configuration.getMilestone().blockTime;
	}

	protected mapEventToEntity(event: Contracts.P2P.ApiNode): Models.ApiNode {
		return {
			height: event.height,
			latency: event.latency,
			url: event.url,
			version: event.version,
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.ApiNode> {
		return this.apiNodeRepositoryFactory(dataSource);
	}
}

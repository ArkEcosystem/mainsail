import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener.js";

@injectable()
export class Peers extends AbstractListener<Contracts.P2P.Peer, Models.Peer> {
	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.PeerRepositoryFactory;

	protected getEventMapping(): ListenerEventMapping {
		return {
			[Enums.PeerEvent.Added]: ListenerEvent.OnAdded,
			[Enums.PeerEvent.Removed]: ListenerEvent.OnRemoved,
		};
	}

	protected getEventId(event: Contracts.P2P.Peer): string {
		const ip = event.ip;
		Utils.assert.defined<string>(ip);
		return ip;
	}

	protected getSyncIntervalMs(): number {
		return this.configuration.getMilestone().timeouts.blockTime;
	}

	protected mapEventToEntity(event: Contracts.P2P.Peer): Models.Peer {
		return {
			height: event.header.height,
			ip: event.ip,
			latency: event.latency,
			plugins: event.plugins as Record<string, any>,
			port: event.port,
			ports: event.ports as Record<string, any>,
			version: event.version,
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.Peer> {
		return this.peerRepositoryFactory(dataSource);
	}
}

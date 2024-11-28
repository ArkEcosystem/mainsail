import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Events } from "@mainsail/contracts";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener.js";

@injectable()
export class DeployerContracts extends AbstractListener<Contracts.Evm.DeployerContract, Models.Contract> {
	@inject(ApiDatabaseIdentifiers.ContractRepositoryFactory)
	private readonly contractRepositoryFactory!: ApiDatabaseContracts.ContractRepositoryFactory;

	protected getEventMapping(): ListenerEventMapping {
		return {
			[Events.DeployerEvent.ContractCreated]: ListenerEvent.OnAdded,
		};
	}

	protected getEventId(event: Contracts.Evm.DeployerContract): string {
		return event.name;
	}

	protected mapEventToEntity(event: Contracts.Evm.DeployerContract): Models.Contract {
		return {
			activeImplementation: event.activeImplementation ?? event.address,
			address: event.address,
			implementations: event.implementations,
			name: event.name,
			proxy: event.proxy,
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.Contract> {
		return this.contractRepositoryFactory(dataSource);
	}
}

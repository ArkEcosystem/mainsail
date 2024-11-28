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
			name: event.name,
			address: event.address,
			proxy: event.proxy,
			implementations: event.implementations,
			activeImplementation: event.activeImplementation,
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.Contract> {
		return this.contractRepositoryFactory(dataSource);
	}
}

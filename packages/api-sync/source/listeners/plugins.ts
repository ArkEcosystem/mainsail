import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener";

type Event = { name: string };

@injectable()
export class Plugins extends AbstractListener<Event, Models.Plugin> {
	@inject(ApiDatabaseIdentifiers.PluginRepositoryFactory)
	private readonly pluginRepositoryFactory!: ApiDatabaseContracts.IPluginRepositoryFactory;

	@inject(Identifiers.ServiceProviderRepository)
	protected readonly serviceProviderRepository!: Providers.ServiceProviderRepository;

	protected getEventMapping(): ListenerEventMapping {
		return {
			[Enums.KernelEvent.ServiceProviderBooted]: ListenerEvent.OnAdded,
		};
	}

	protected getEventId(event: Event): string {
		return event.name;
	}

	protected getSyncIntervalMs(): number {
		return this.configuration.getMilestone().blockTime;
	}

	protected mapEventToEntity({ name }: Event): Models.Plugin {
		const serviceProvider = this.serviceProviderRepository.get(name);
		const configuration = serviceProvider.config().all();

		return {
			name,
			configuration: this.sanitizeConfiguration(configuration),
		};
	}

	protected makeEntityRepository(
		dataSource: ApiDatabaseContracts.RepositoryDataSource,
	): ApiDatabaseContracts.Repository<Models.Plugin> {
		return this.pluginRepositoryFactory(dataSource);
	}

	private sanitizeConfiguration(config: Contracts.Types.JsonObject): any {
		for (const key in config) {
			if (config.hasOwnProperty(key)) {
				if (key.toLowerCase() === 'password') {
					config[key] = '-';
					continue;
				}

				const value = config[key]
				if (typeof value === "object") {
					config[key] = this.sanitizeConfiguration(value as Contracts.Types.JsonObject);
				}
			}
		}

		return config;
	}
}

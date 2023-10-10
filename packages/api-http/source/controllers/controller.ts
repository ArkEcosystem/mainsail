import { AbstractController, Contracts as ApiCommonContracts } from "@mainsail/api-common";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class Controller extends AbstractController {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "api-http")
	protected readonly apiConfiguration!: Providers.PluginConfiguration;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	protected readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

	protected getListingOptions(): ApiCommonContracts.Options {
		const estimateTotalCount = this.apiConfiguration.getOptional<boolean>("options.estimateTotalCount", true);

		return {
			estimateTotalCount,
		};
	}

	protected async getState(): Promise<Models.State> {
		const stateRepository = this.stateRepositoryFactory();
		const state = await stateRepository.createQueryBuilder().getOne();
		return state ?? ({ height: "0", supply: "0" } as Models.State);
	}
}

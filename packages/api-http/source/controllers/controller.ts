import { AbstractController } from "@mainsail/api-common";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { EnrichedBlock, EnrichedTransaction } from "../resources/index.js";

@injectable()
export class Controller extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-http")
	protected readonly apiConfiguration!: Providers.PluginConfiguration;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	protected readonly stateRepositoryFactory!: ApiDatabaseContracts.StateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.ConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	protected readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	protected getListingOptions(): Contracts.Api.Options {
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

	protected async getConfiguration(): Promise<Models.Configuration> {
		const configurationRepository = this.configurationRepositoryFactory();
		const configuration = await configurationRepository.createQueryBuilder().getOne();

		return configuration ?? ({} as Models.Configuration);
	}

	protected async enrichBlockResult(
		resultPage: Search.ResultsPage<Models.Block>,
		{ state, generators }: { state?: Models.State; generators: Record<string, Models.Wallet> },
	): Promise<Search.ResultsPage<EnrichedBlock>> {
		state = state ?? (await this.getState());

		const enriched: Promise<EnrichedBlock | null>[] = [];
		for (const block of resultPage.results) {
			enriched.push(this.enrichBlock(block, state, generators[block.generatorAddress]));
		}

		// @ts-ignore
		resultPage.results = await Promise.all(enriched);
		return resultPage as Search.ResultsPage<EnrichedBlock>;
	}

	protected async enrichBlock(
		block: Models.Block | null,
		state?: Models.State,
		generator?: Models.Wallet,
	): Promise<EnrichedBlock | null> {
		if (!block) {
			return null;
		}

		const promises: Promise<any>[] = [];
		if (!state) {
			promises.push(
				(async () => {
					state = await this.getState();
				})(),
			);
		}

		if (!generator) {
			promises.push(
				(async () => {
					generator = await this.walletRepositoryFactory()
						.createQueryBuilder()
						.select()
						.where("public_key = :publicKey", { publicKey: block.generatorAddress })
						.getOneOrFail();
				})(),
			);
		}

		if (promises.length > 0) {
			await Promise.all(promises);
		}

		Utils.assert.defined<Models.Wallet>(generator);
		Utils.assert.defined<Models.Wallet>(state);

		return { ...block, generator, state };
	}

	protected async enrichTransactionResult(
		resultPage: Search.ResultsPage<Models.Transaction>,
		context?: { state?: Models.State },
	): Promise<Search.ResultsPage<EnrichedTransaction>> {
		const state = context?.state ?? (await this.getState());
		return {
			...resultPage,
			results: await Promise.all(resultPage.results.map((tx) => this.enrichTransaction(tx, state))),
		};
	}

	protected async enrichTransaction(
		transaction: Models.Transaction,
		state?: Models.State,
	): Promise<EnrichedTransaction> {
		return { ...transaction, state: state ? state : await this.getState() };
	}
}

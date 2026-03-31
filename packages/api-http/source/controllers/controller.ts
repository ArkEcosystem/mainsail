import { AbstractController, Types } from "@mainsail/api-common";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

import {
	EnrichedBlock,
	EnrichedTransaction,
	TransactionTokenAction,
	TransactionTokenActionRaw,
} from "../resources/index.js";

@injectable()
export class Controller extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-http")
	protected readonly apiConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	protected readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	protected readonly stateRepositoryFactory!: ApiDatabaseContracts.StateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.ConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	protected readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	protected getListingOptions(request: Types.HapiRequest): Search.Options {
		const estimateTotalCount = this.apiConfiguration.getOptional<boolean>("options.estimateTotalCount", true);

		return {
			estimateTotalCount,
			fullReceipt: request.query.fullReceipt,
		};
	}

	protected async getState(): Promise<Models.State> {
		const stateRepository = this.stateRepositoryFactory();
		const state = await stateRepository.createQueryBuilder().getOne();
		return state ?? ({ blockNumber: "0", supply: "0" } as Models.State);
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
			enriched.push(this.enrichBlock(block, state, generators[block.proposer]));
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

		const promises: Promise<unknown>[] = [];
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
					generator =
						(await this.walletRepositoryFactory()
							.createQueryBuilder()
							.select()
							.where("address = :address", { address: block.proposer })
							.getOne()) ??
						({
							address: block.proposer,
							attributes: {},
							balance: "0",
							nonce: "0",
							publicKey: "",
							updated_at: "0",
						} as Models.Wallet);
				})(),
			);
		}

		if (promises.length > 0) {
			await Promise.all(promises);
		}

		assert.defined(generator);
		assert.defined(state);

		return { ...block, generator, state };
	}

	protected async enrichTransactionResult(
		resultPage: Search.ResultsPage<Models.Transaction>,
		context?: { state?: Models.State; fullReceipt?: boolean; includeTokens?: boolean },
	): Promise<Search.ResultsPage<EnrichedTransaction>> {
		const state = context?.state ?? (await this.getState());

		let tokens: Record<string, TransactionTokenAction[]> = {};
		if (context?.includeTokens) {
			tokens = await this.fetchTransactionTokens(resultPage.results.map((t) => t.hash));
		}

		return {
			...resultPage,
			results: await Promise.all(
				resultPage.results.map((tx) =>
					this.enrichTransaction(tx, { ...context, state, tokens: tokens[tx.hash] }),
				),
			),
		};
	}

	protected async enrichTransaction(
		transaction: Models.Transaction,
		context?: { state?: Models.State; fullReceipt?: boolean; tokens?: TransactionTokenAction[] },
	): Promise<EnrichedTransaction> {
		const [state] = await Promise.all([context?.state ? context.state : this.getState()]);

		return { ...transaction, fullReceipt: context?.fullReceipt ?? false, state, tokens: context?.tokens };
	}

	protected async fetchTransactionTokens(
		transactionHashes: string[],
	): Promise<Record<string, TransactionTokenAction[]>> {
		const maxTokensPerTx = 10;

		const sql = `
SELECT
  h.transaction_hash AS "transactionHash",
  tt.action AS "action",
  tt.from AS "from",
  tt.to AS "to",
  tt.value AS "value",
  tt.index AS "index",
  tok.address AS "tokenAddress",
  tok.symbol AS "tokenSymbol",
  tok.decimals AS "tokenDecimals",
  tok.name AS "tokenName"
FROM
  unnest($1::text[]) AS h(transaction_hash)
  JOIN LATERAL (
    SELECT
      *
    FROM
      token_actions tt
    WHERE
      tt.transaction_hash = h.transaction_hash
    ORDER BY
      tt.index ASC
    LIMIT
      $2
  ) tt ON true
  JOIN tokens tok ON tok.address = tt.address
ORDER BY
  h.transaction_hash ASC,
  tt.index ASC
`;
		const rows = await this.dataSource.query<TransactionTokenActionRaw[]>(sql, [transactionHashes, maxTokensPerTx]);

		return rows.reduce<Record<string, TransactionTokenAction[]>>((accumulator, current) => {
			if (!accumulator[current.transactionHash]) {
				accumulator[current.transactionHash] = [];
			}

			accumulator[current.transactionHash].push({
				action: current.action,
				from: current.from,
				index: current.index,
				metadata: {
					tokenAddress: current.tokenAddress,
					tokenDecimals: current.tokenDecimals,
					tokenName: current.tokenName,
					tokenSymbol: current.tokenSymbol,
				},
				to: current.to,
				value: current.value,
			});
			return accumulator;
		}, {});
	}

	protected getBlockCriteriaByIdOrHeight(idOrHeight: string): Search.Criteria.OrBlockCriteria {
		const asHeight = Number(idOrHeight);
		// NOTE: This assumes all block ids are sha256 and never a valid number below this threshold.
		return !Number.isNaN(asHeight) && asHeight <= Number.MAX_SAFE_INTEGER
			? { number: asHeight }
			: { hash: idOrHeight };
	}
}

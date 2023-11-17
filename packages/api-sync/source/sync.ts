import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Types, Utils } from "@mainsail/kernel";
import { sleep } from "@mainsail/utils";
import { performance } from "perf_hooks";

interface DeferredSync {
	block: Models.Block;
	transactions: Models.Transaction[];
	validatorRound?: Models.ValidatorRound;
	wallets: Models.Wallet[];
}

const drainQueue = async (queue: Contracts.Kernel.Queue) => new Promise((resolve) => queue.once("drain", resolve));

@injectable()
export class Sync implements Contracts.ApiSync.ISync {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(ApiDatabaseIdentifiers.Migrations)
	private readonly migrations!: ApiDatabaseContracts.IMigrations;

	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.IConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	private readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
	private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.ITransactionTypeRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.IValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.ProposerSelector;

	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly transactionHandlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.QueueFactory)
	private readonly createQueue!: Types.QueueFactory;
	#queue!: Contracts.Kernel.Queue;

	public async prepareBootstrap(): Promise<void> {
		await this.migrations.run();

		await this.#resetDatabaseIfNecessary();
	}

	public async bootstrap(): Promise<void> {
		await this.#bootstrapConfiguration();
		await this.#bootstrapState();
		await this.#bootstrapTransactionTypes();

		this.#queue = await this.createQueue();
		await this.#queue.start();
	}

	public async beforeCommit(): Promise<void> {
		while (this.#queue.size() > 0) {
			await drainQueue(this.#queue);
		}
	}

	public async onCommit(unit: Contracts.Processor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();

		const {
			block: { header, transactions },
			commit,
		} = committedBlock;

		const dirtyWallets = [...unit.getWalletRepository().getDirtyWallets()];

		const deferredSync: DeferredSync = {
			block: {
				generatorPublicKey: header.generatorPublicKey,
				height: header.height.toFixed(),
				id: header.id,
				numberOfTransactions: header.numberOfTransactions,
				payloadHash: header.payloadHash,
				payloadLength: header.payloadLength,
				previousBlock: header.previousBlock,
				reward: header.reward.toFixed(),
				signature: commit.signature,
				timestamp: header.timestamp.toFixed(),
				totalAmount: header.totalAmount.toFixed(),
				totalFee: header.totalFee.toFixed(),
				version: header.version,
			},

			transactions: transactions.map(({ data }) => ({
				amount: data.amount.toFixed(),
				asset: data.asset,
				blockHeight: header.height.toFixed(),
				blockId: header.id,
				fee: data.fee.toFixed(),
				id: data.id!,
				nonce: data.nonce.toFixed(),
				recipientId: data.recipientId,
				senderPublicKey: data.senderPublicKey,
				sequence: data.sequence!,
				signature: data.signature!,
				timestamp: header.timestamp.toFixed(),
				type: data.type,
				typeGroup: data.typeGroup,
				vendorField: data.vendorField,
				version: data.version,
			})),

			wallets: dirtyWallets.map((wallet) => ({
				address: wallet.getAddress(),
				attributes: wallet.getAttributes(),
				balance: wallet.getBalance().toFixed(),
				nonce: wallet.getNonce().toFixed(),
				publicKey: wallet.getPublicKey()!,
			})),

			...(Utils.roundCalculator.isNewRound(header.height + 1, this.configuration)
				? {
						validatorRound: this.#createValidatorRound(header.height + 1),
				  }
				: {}),
		};

		return this.#queueDeferredSync(deferredSync);
	}

	#createValidatorRound(height: number): Models.ValidatorRound {
		const activeValidators = this.validatorSet.getActiveValidators();

		return {
			...Utils.roundCalculator.calculateRound(height, this.configuration),
			// Map the active validator set (static, vote-weighted, etc.) to actual proposal order
			validators: Array.from({ length: activeValidators.length }, (_, index) =>
				activeValidators[this.proposerSelector.getValidatorIndex(index)].getWalletPublicKey(),
			),
		};
	}

	public async getLastSyncedBlockHeight(): Promise<number> {
		return (await this.blockRepositoryFactory().getLatestHeight()) ?? 0;
	}

	async #bootstrapConfiguration(): Promise<void> {
		await this.configurationRepositoryFactory().upsert(
			{
				cryptoConfiguration: (this.configuration.all() ?? {}) as Record<string, any>,
				id: 1,
				version: this.app.version(),
			},
			["id"],
		);
	}

	async #bootstrapState(): Promise<void> {
		const genesisBlock = this.stateService.getStateStore().getGenesisBlock();
		await this.stateRepositoryFactory()
			.createQueryBuilder()
			.insert()
			.orIgnore()
			.values({
				height: "0",
				id: 1,
				supply: genesisBlock.block.data.totalAmount.toFixed(),
			})
			.execute();
	}

	async #bootstrapTransactionTypes(): Promise<void> {
		const transactionHandlers = await this.transactionHandlerRegistry.getActivatedHandlers();

		const types: Models.TransactionType[] = [];

		for (const handler of transactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;
			const version: number | undefined = constructor.version;
			const key: string | undefined = constructor.key;

			Utils.assert.defined<number>(type);
			Utils.assert.defined<number>(typeGroup);
			Utils.assert.defined<number>(version);
			Utils.assert.defined<string>(key);

			types.push({ key, schema: constructor.getSchema().properties, type, typeGroup, version });
		}

		types.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type - b.type;
			}

			if (a.typeGroup !== b.typeGroup) {
				return a.typeGroup - b.typeGroup;
			}

			return a.version - b.version;
		});

		await this.transactionTypeRepositoryFactory().upsert(types, ["type", "typeGroup", "version"]);
	}

	async #queueDeferredSync(deferredSync: DeferredSync): Promise<void> {
		void this.#queue.push({
			handle: async () => {
				const maxDelay = 30_000;

				let success = false;
				const baseDelay = 500;

				let attempts = 0;
				do {
					try {
						await this.#syncToDatabase(deferredSync);
						success = true;
					} catch (error) {
						const nextAttemptDelay = Math.min(baseDelay + attempts * 500, maxDelay);
						attempts++;
						this.logger.warning(
							`sync encountered exception: ${error.message}. retry #${attempts} in ... ${nextAttemptDelay}ms`,
						);
						await sleep(nextAttemptDelay);
					}
				} while (!success);
			},
		});
	}

	async #syncToDatabase(deferred: DeferredSync): Promise<void> {
		const t0 = performance.now();

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = this.blockRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);

			await blockRepository.createQueryBuilder().insert().orIgnore().values(deferred.block).execute();

			await stateRepository
				.createQueryBuilder()
				.update()
				.set({
					height: deferred.block.height,
					supply: () => `supply + ${deferred.block.reward}`,
				})
				.where("id = :id", { id: 1 })
				// TODO: consider additional check constraint (OLD.height = NEW.height - 1)
				.andWhere("height = :previousHeight", {
					previousHeight: Utils.BigNumber.make(deferred.block.height).minus(1).toFixed(),
				})
				.execute();

			await transactionRepository
				.createQueryBuilder()
				.insert()
				.orIgnore()
				.values(deferred.transactions)
				.execute();

			if (deferred.validatorRound) {
				await validatorRoundRepository
					.createQueryBuilder()
					.insert()
					.orIgnore()
					.values(deferred.validatorRound)
					.execute();
			}

			await walletRepository.upsert(deferred.wallets, ["address"]);
		});

		const t1 = performance.now();

		this.logger.debug(`synced committed block: ${deferred.block.height} in ${t1 - t0}ms`);
	}

	async #resetDatabaseIfNecessary(): Promise<void> {
		const forcedTruncateDatabase = this.pluginConfiguration.getOptional<boolean>("truncateDatabase", false);
		if (!forcedTruncateDatabase) {
			return;
		}

		this.logger.warning(`resetting API database and state to genesis block for full resync`);

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = this.blockRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);

			// Ensure all tables are truncated (already supposed to be idempotent, but it's cleaner)
			await Promise.all(
				[
					blockRepository,
					stateRepository,
					transactionRepository,
					validatorRoundRepository,
					walletRepository,
				].map((repo) => repo.clear()),
			);
		});
	}
}

import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Types, Utils } from "@mainsail/kernel";
import { chunk, sleep, validatorSetPack } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { Listeners } from "./contracts.js";

interface DeferredSync {
	block: Models.Block;
	transactions: Models.Transaction[];
	receipts: Models.Receipt[];
	validatorRound?: Models.ValidatorRound;
	wallets: Array<Array<any>>;
	newMilestones?: Record<string, any>;
}

const drainQueue = async (queue: Contracts.Kernel.Queue) => new Promise((resolve) => queue.once("drain", resolve));

@injectable()
export class Sync implements Contracts.ApiSync.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(ApiDatabaseIdentifiers.Migrations)
	private readonly migrations!: ApiDatabaseContracts.Migrations;

	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.ConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ReceiptRepositoryFactory)
	private readonly receiptRepositoryFactory!: ApiDatabaseContracts.ReceiptRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	private readonly stateRepositoryFactory!: ApiDatabaseContracts.StateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
	private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.TransactionTypeRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly transactionHandlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.Services.Queue.Factory)
	private readonly createQueue!: Types.QueueFactory;
	#queue!: Contracts.Kernel.Queue;

	@inject(Identifiers.ApiSync.Listener)
	private readonly listeners!: Listeners;

	public async prepareBootstrap(): Promise<void> {
		await this.migrations.run();
		await this.#resetDatabaseIfNecessary();
	}

	public async bootstrap(): Promise<void> {
		await this.#bootstrapConfiguration();
		await this.#bootstrapState();
		await this.#bootstrapTransactionTypes();

		await this.listeners.bootstrap();

		this.#queue = await this.createQueue();
		await this.#queue.start();
	}

	public async beforeCommit(): Promise<void> {
		while (this.#queue.size() > 0) {
			await drainQueue(this.#queue);
		}
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const commit = await unit.getCommit();

		const {
			block: { header, transactions },
			proof,
		} = commit;

		const addressToPublicKey: Record<string, string> = {};
		const publicKeyToAddress: Record<string, string> = {};
		const transactionReceipts: Models.Receipt[] = [];

		let receipts: Map<string, Contracts.Evm.TransactionReceipt> | undefined;

		if (unit.hasProcessorResult()) {
			receipts = unit.getProcessorResult().receipts;
		}

		for (const transaction of transactions) {
			const { senderPublicKey } = transaction.data;
			if (!publicKeyToAddress[senderPublicKey]) {
				const address = await this.addressFactory.fromPublicKey(senderPublicKey);
				publicKeyToAddress[senderPublicKey] = address;
				addressToPublicKey[address] = senderPublicKey;
			}

			const receipt = receipts?.get(transaction.id);
			if (receipt) {
				transactionReceipts.push({
					blockHeight: header.height.toFixed(),
					deployedContractAddress: receipt.deployedContractAddress,
					gasRefunded: Number(receipt.gasRefunded),
					gasUsed: Number(receipt.gasUsed),
					id: transaction.id,
					logs: receipt.logs,
					output: receipt.output,
					success: receipt.success,
				});
			}
		}

		const dirtyValidators = this.validatorSet.getDirtyValidators().reduce((accumulator, current) => {
			accumulator[current.address] = current;
			return accumulator;
		}, {});

		const accountUpdates: Array<Contracts.Evm.AccountUpdate> = unit.getAccountUpdates();

		const validatorAttributes = (address: string) => {
			const dirtyValidator = dirtyValidators[address];
			const isBlockValidator = header.generatorAddress === address;

			return {
				...(dirtyValidator
					? {
							validatorPublicKey: dirtyValidator.blsPublicKey,
							validatorVoteBalance: dirtyValidator.voteBalance,
							validatorResigned: dirtyValidator.isResigned,
							// updated at end of db transaction
							// - validatorRank
							// - validatorApproval
						}
					: {}),
				...(isBlockValidator
					? {
							// incrementally applied in UPSERT below
							validatorForgedFees: header.totalFee.toFixed(),
							validatorForgedRewards: header.totalAmount.toFixed(),
							validatorForgedTotal: header.totalFee.plus(header.totalAmount).toFixed(),
							validatorLastBlock: {
								height: header.height,
								id: header.id,
								timestamp: header.timestamp,
							},
							validatorProducedBlocks: 1,
						}
					: {}),
			};
		};

		const wallets = accountUpdates.map((account) => {
			const attributes = {
				...validatorAttributes(account.address),
				...(account.unvote ? { unvote: account.unvote } : account.vote ? { vote: account.vote } : {}),
			};

			return [
				account.address,
				addressToPublicKey[account.address] ?? "",
				Utils.BigNumber.make(account.balance).toFixed(),
				Utils.BigNumber.make(account.nonce).toFixed(),
				attributes,
				header.height.toFixed(),
			];
		});

		// The block validator might not be "dirty" when no rewards have been distributed,
		// thus ensure it is manually inserted.
		const blockValidator = accountUpdates.find((a) => a.address === header.generatorAddress);
		if (!blockValidator) {
			wallets.push([
				header.generatorAddress,
				"",
				"-1",
				"-1",
				{
					...validatorAttributes(header.generatorAddress),
				},
				header.height.toFixed(),
			]);
		}

		const deferredSync: DeferredSync = {
			block: {
				commitRound: proof.round,
				generatorAddress: header.generatorAddress,
				height: header.height.toFixed(),
				id: header.id,
				numberOfTransactions: header.numberOfTransactions,
				payloadHash: header.payloadHash,
				payloadLength: header.payloadLength,
				previousBlock: header.previousBlock,
				reward: header.reward.toFixed(),
				round: header.round,
				signature: proof.signature,
				stateHash: header.stateHash,
				timestamp: header.timestamp.toFixed(),
				totalAmount: header.totalAmount.toFixed(),
				totalFee: header.totalFee.toFixed(),
				totalGasUsed: header.totalGasUsed,
				validatorRound: Utils.roundCalculator.calculateRound(header.height, this.configuration).round,
				validatorSet: validatorSetPack(proof.validators).toString(),
				version: header.version,
			},

			receipts: transactionReceipts,

			transactions: transactions.map(({ data }) => ({
				amount: data.amount.toFixed(),
				asset: data.asset,
				blockHeight: header.height.toFixed(),
				blockId: header.id,
				fee: data.fee.toFixed(),
				id: data.id as unknown as string,
				nonce: data.nonce.toFixed(),
				recipientId: data.recipientId,
				senderPublicKey: data.senderPublicKey,
				sequence: data.sequence as unknown as number,
				signature: data.signature,
				signatures: data.signatures,
				timestamp: header.timestamp.toFixed(),
				type: data.type,
				typeGroup: data.typeGroup,
				vendorField: data.vendorField,
				version: data.version,
			})),

			wallets,

			...(Utils.roundCalculator.isNewRound(header.height + 1, this.configuration)
				? {
						validatorRound: this.#createValidatorRound(header.height + 1),
					}
				: {}),

			...(this.configuration.isNewMilestone(header.height + 1)
				? {
						newMilestones: this.configuration.getMilestone(header.height + 1),
					}
				: {}),
		};

		return this.#queueDeferredSync(deferredSync);
	}

	#createValidatorRound(height: number): Models.ValidatorRound {
		const activeValidators = this.validatorSet.getActiveValidators();

		// Map the active validator set (static, vote-weighted, etc.) to actual proposal order
		const validatorWallets = Array.from(
			{ length: activeValidators.length },
			(_, index) => activeValidators[this.proposerSelector.getValidatorIndex(index)],
		);

		return {
			...Utils.roundCalculator.calculateRound(height, this.configuration),
			validators: validatorWallets.map((v) => v.address),
			votes: validatorWallets.map((v) => v.voteBalance.toFixed()),
		};
	}

	public async getLastSyncedBlockHeight(): Promise<number> {
		return (await this.blockRepositoryFactory().getLatestHeight()) ?? 0;
	}

	async #bootstrapConfiguration(): Promise<void> {
		await this.configurationRepositoryFactory()
			.createQueryBuilder()
			.insert()
			.values({
				activeMilestones: this.configuration.getMilestone(0) as Record<string, any>,
				cryptoConfiguration: (this.configuration.all() ?? {}) as Record<string, any>,
				id: 1,
				version: this.app.version(),
			})
			.orUpdate(["crypto_configuration", "version"], ["id"])
			.execute();
	}

	async #bootstrapState(): Promise<void> {
		const genesisCommit = this.stateStore.getGenesisCommit();
		await this.stateRepositoryFactory()
			.createQueryBuilder()
			.insert()
			.orIgnore()
			.values({
				height: "0",
				id: 1,
				supply: genesisCommit.block.data.totalAmount.toFixed(),
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
			const configurationRepository = this.configurationRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const receiptRepository = this.receiptRepositoryFactory(entityManager);
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
				.andWhere("height = :previousHeight", {
					previousHeight: Utils.BigNumber.make(deferred.block.height).minus(1).toFixed(),
				})
				.execute();

			for (const batch of chunk(deferred.transactions, 256)) {
				await transactionRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			for (const batch of chunk(deferred.receipts, 256)) {
				await receiptRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			if (deferred.validatorRound) {
				await validatorRoundRepository
					.createQueryBuilder()
					.insert()
					.orIgnore()
					.values(deferred.validatorRound)
					.execute();
			}

			if (deferred.newMilestones) {
				await configurationRepository
					.createQueryBuilder()
					.update()
					.set({
						activeMilestones: deferred.newMilestones,
					})
					.where("id = :id", { id: 1 })
					.execute();
			}

			for (const batch of chunk(deferred.wallets, 256)) {
				const batchParameterLength = 6;
				const placeholders = batch
					.map(
						(_, index) =>
							`($${index * batchParameterLength + 1},$${index * batchParameterLength + 2},$${index * batchParameterLength + 3},$${index * batchParameterLength + 4},$${index * batchParameterLength + 5},$${index * batchParameterLength + 6})`,
					)
					.join(", ");

				const parameters = batch.flat();

				await walletRepository.query(
					`
	INSERT INTO wallets AS "Wallet" (address, public_key, balance, nonce, attributes, updated_at)
	VALUES ${placeholders}
	ON CONFLICT ("address") DO UPDATE SET 
		balance = COALESCE(NULLIF(EXCLUDED.balance, '-1'), "Wallet".balance),
		nonce = COALESCE(NULLIF(EXCLUDED.nonce, '-1'), "Wallet".nonce),
		updated_at = COALESCE(EXCLUDED.updated_at, "Wallet".updated_at),
		public_key = COALESCE(NULLIF(EXCLUDED.public_key, ''), "Wallet".public_key),
		attributes = jsonb_strip_nulls(jsonb_build_object(
			-- if any unvote is present, it will overwrite the previous vote
			'vote',
			CASE 
				WHEN EXCLUDED.attributes->>'unvote' IS NOT NULL THEN NULL 
				ELSE COALESCE(EXCLUDED.attributes->>'vote', "Wallet".attributes->>'vote')
			END,

			'validatorPublicKey',
			COALESCE(EXCLUDED.attributes->>'validatorPublicKey', "Wallet".attributes->>'validatorPublicKey'),
			'validatorResigned',
			COALESCE(EXCLUDED.attributes->>'validatorResigned', "Wallet".attributes->>'validatorResigned'),			
			'validatorVoteBalance',
			COALESCE((EXCLUDED.attributes->>'validatorVoteBalance')::text, ("Wallet".attributes->>'validatorVoteBalance')::text),
			'validatorLastBlock',
			COALESCE(EXCLUDED.attributes->>'validatorLastBlock', "Wallet".attributes->>'validatorLastBlock'),
			'validatorForgedFees',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedFees')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedFees')::numeric, 0)::numeric)::text, '0'),
			'validatorForgedRewards',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedRewards')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedRewards')::numeric, 0)::numeric)::text, '0'),
			'validatorForgedTotal',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedTotal')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedTotal')::numeric, 0)::numeric)::text, '0'),
			'validatorProducedBlocks',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorProducedBlocks')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorProducedBlocks')::numeric, 0)::numeric)::text, '0')
					))`,
					parameters,
				);
			}

			// TODO: only update when round changes?
			await entityManager.query("SELECT update_validator_ranks();", []);
		});

		const t1 = performance.now();

		if (!this.state.isBootstrap()) {
			this.logger.debug(`synced commit: ${deferred.block.height} in ${t1 - t0}ms`);
		}
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
			const receiptRepository = this.receiptRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);

			// Ensure all tables are truncated (already supposed to be idempotent, but it's cleaner)
			await Promise.all(
				[
					blockRepository,
					stateRepository,
					transactionRepository,
					receiptRepository,
					validatorRoundRepository,
					walletRepository,
				].map((repo) => repo.clear()),
			);
		});
	}
}

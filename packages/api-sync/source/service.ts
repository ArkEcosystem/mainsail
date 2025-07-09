import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Types } from "@mainsail/kernel";
import { BigNumber, chunk, formatEcdsaSignature, sleep, validatorSetPack } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { Listeners } from "./contracts.js";
import { Restore } from "./restore.js";

interface DeferredSync {
	block: Models.Block;
	transactions: Models.Transaction[];
	receipts: Models.Receipt[];
	validatorRound?: Models.ValidatorRound;
	wallets: Array<Array<any>>;
	mergedLegacyColdWallets: ({ legacyAddress: string } & Contracts.Evm.AccountMergeInfo)[];
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

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(ApiDatabaseIdentifiers.Migrations)
	private readonly migrations!: ApiDatabaseContracts.Migrations;

	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ContractRepositoryFactory)
	private readonly contractRepositoryFactory!: ApiDatabaseContracts.ContractRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.ConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ReceiptRepositoryFactory)
	private readonly receiptRepositoryFactory!: ApiDatabaseContracts.ReceiptRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	private readonly stateRepositoryFactory!: ApiDatabaseContracts.StateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory)
	private readonly legacyColdWalletRepositoryFactory!: ApiDatabaseContracts.LegacyColdWalletRepositoryFactory;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

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

	public async bootstrap(): Promise<void> {
		await this.migrations.run();
		await this.#resetDatabaseIfNecessary();
		this.#queue = await this.createQueue();

		// if our database is empty, we sync all blocks from scratch
		const [blocks] = await this.dataSource.query("select count(1) from blocks");
		if (blocks.count === "0") {
			await this.#bootstrapRestore();
		}

		await this.listeners.bootstrap();

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
		const mergedLegacyColdWallets: ({ legacyAddress: string } & Contracts.Evm.AccountMergeInfo)[] = [];

		const receipts = unit.getProcessorResult().receipts;

		for (const transaction of transactions) {
			const { senderPublicKey } = transaction.data;
			if (!publicKeyToAddress[senderPublicKey]) {
				const address = await this.addressFactory.fromPublicKey(senderPublicKey);
				publicKeyToAddress[senderPublicKey] = address;
				addressToPublicKey[address] = senderPublicKey;
			}

			const receipt = receipts?.get(transaction.hash);
			if (receipt) {
				transactionReceipts.push({
					blockNumber: header.number.toFixed(),
					contractAddress: receipt.contractAddress,
					gasRefunded: Number(receipt.gasRefunded),
					gasUsed: Number(receipt.gasUsed),
					logs: receipt.logs,
					output: receipt.output,
					status: receipt.status,
					transactionHash: transaction.hash,
				});
			}
		}

		const dirtyValidators: Record<string, Contracts.State.ValidatorWallet> = this.validatorSet
			.getDirtyValidators()
			.reduce((accumulator, current) => {
				accumulator[current.address] = current;
				return accumulator;
			}, {});

		const accountUpdates: Record<string, Contracts.Evm.AccountUpdate> = unit
			.getAccountUpdates()
			.reduce((accumulator, current) => {
				accumulator[current.address] = current;
				return accumulator;
			}, {});

		const validatorAttributes = (address: string) => {
			const dirtyValidator = dirtyValidators[address];
			const isBlockValidator = header.proposer === address;

			return {
				...(dirtyValidator
					? {
							validatorFee: dirtyValidator.fee,
							validatorPublicKey: dirtyValidator.blsPublicKey,
							validatorResigned: dirtyValidator.isResigned,
							validatorVoteBalance: dirtyValidator.voteBalance,
							validatorVotersCount: dirtyValidator.votersCount,
							// updated at end of db transaction
							// - validatorRank
							// - validatorApproval
						}
					: {}),
				...(isBlockValidator
					? {
							// incrementally applied in UPSERT below
							validatorForgedFees: header.fee.toFixed(),
							validatorForgedRewards: header.reward.toFixed(),
							validatorForgedTotal: header.fee.plus(header.reward).toFixed(),
							validatorLastBlock: {
								hash: header.hash,
								number: header.number,
								timestamp: header.timestamp,
							},
							validatorProducedBlocks: 1,
						}
					: {}),
			};
		};

		const wallets = Object.values(accountUpdates).map((account) => {
			const attributes = {
				...validatorAttributes(account.address),
				...(account.unvote ? { unvote: account.unvote } : account.vote ? { vote: account.vote } : {}),
				...(account.usernameResigned
					? { usernameResigned: account.usernameResigned }
					: account.username
						? { username: account.username }
						: {}),
			};

			if (account.legacyMergeInfo) {
				attributes["legacyMerge"] = account.legacyMergeInfo;
				mergedLegacyColdWallets.push({
					address: account.address, // mainsail address
					legacyAddress: account.legacyMergeInfo.address,
					txHash: account.legacyMergeInfo.txHash,
				});
			}

			return [
				account.address,
				addressToPublicKey[account.address] ?? null,
				BigNumber.make(account.balance).toFixed(),
				BigNumber.make(account.nonce).toFixed(),
				attributes,
				header.number.toFixed(),
			];
		});

		// The block validator/dirty validators might not be part of the account updates if no rewards have been distributed,
		// thus ensure they are manually inserted.
		for (const validatorAddress of [
			...new Set([
				header.proposer,
				...Object.values<Contracts.State.ValidatorWallet>(dirtyValidators).map((v) => v.address),
			]),
		]) {
			if (!accountUpdates[validatorAddress]) {
				wallets.push([
					validatorAddress,
					addressToPublicKey[validatorAddress] ?? null,
					"-1",
					"-1",
					{
						...validatorAttributes(validatorAddress),
					},
					header.number.toFixed(),
				]);
			}
		}

		const deferredSync: DeferredSync = {
			block: {
				commitRound: proof.round,
				fee: header.fee.toFixed(),
				gasUsed: header.gasUsed,
				hash: header.hash,
				number: header.number.toFixed(),
				parentHash: header.parentHash,
				payloadSize: header.payloadSize,
				proposer: header.proposer,
				reward: header.reward.toFixed(),
				round: header.round,
				signature: proof.signature,
				stateRoot: header.stateRoot,
				timestamp: header.timestamp.toFixed(),
				transactionsCount: header.transactionsCount,
				transactionsRoot: header.transactionsRoot,
				validatorRound: this.roundCalculator.calculateRound(header.number).round,
				validatorSet: validatorSetPack(proof.validators).toString(),
				version: header.version,
			},

			mergedLegacyColdWallets,

			receipts: transactionReceipts,

			transactions: transactions.map(({ data }) => ({
				blockHash: header.hash,
				blockNumber: header.number.toFixed(),
				data: data.data,
				from: data.from,
				gas: data.gas,
				gasPrice: data.gasPrice,
				hash: data.hash,
				legacySecondSignature: data.legacySecondSignature,
				nonce: data.nonce.toFixed(),
				senderPublicKey: data.senderPublicKey,
				signature: formatEcdsaSignature(data.r!, data.s!, data.v!),
				timestamp: header.timestamp.toFixed(),
				to: data.to,
				transactionIndex: data.transactionIndex!,
				value: data.value.toFixed(),
			})),
			wallets,

			...(this.roundCalculator.isNewRound(header.number + 1)
				? {
						validatorRound: this.#createValidatorRound(header.number + 1),
					}
				: {}),

			...(this.configuration.isNewMilestone(header.number + 1)
				? {
						newMilestones: this.configuration.getMilestone(header.number + 1),
					}
				: {}),
		};

		return this.#queueDeferredSync(deferredSync);
	}

	#createValidatorRound(number: number): Models.ValidatorRound {
		const roundValidators = this.validatorSet.getRoundValidators();

		// Map the round validator set (static, vote-weighted, etc.) to actual proposal order
		const validatorWallets = Array.from(
			{ length: roundValidators.length },
			(_, index) => roundValidators[this.proposerCalculator.getValidatorIndex(index)],
		);

		return {
			...this.roundCalculator.calculateRound(number),
			validators: validatorWallets.map((v) => v.address),
			votes: validatorWallets.map((v) => v.voteBalance.toFixed()),
		};
	}

	public async getLastSyncedBlockHeight(): Promise<number> {
		return (await this.blockRepositoryFactory().getLatestHeight()) ?? this.configuration.getGenesisHeight();
	}

	async #bootstrapRestore(): Promise<void> {
		await this.app.resolve(Restore).restore();
	}

	async #queueDeferredSync(deferredSync: DeferredSync): Promise<void> {
		void this.#queue.push({
			handle: async () => {
				const maxDelay = 30_000;

				let success = false;
				const baseDelay = 500;

				const maxAttempts = this.pluginConfiguration.getOptional<number>(
					"maxSyncAttempts",
					Number.MAX_SAFE_INTEGER,
				);

				let attempts = 0;
				do {
					try {
						await this.#syncToDatabase(deferredSync);
						success = true;
					} catch (error) {
						const nextAttemptDelay = Math.min(baseDelay + attempts * 500, maxDelay);
						attempts++;
						this.logger.warning(
							`sync encountered exception: ${error.message} (query: ${error.query}). retry #${attempts} in ... ${nextAttemptDelay}ms`,
						);
						await sleep(nextAttemptDelay);
					}
				} while (!success && attempts < maxAttempts);
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
			const legacyColdwalletRepository = this.legacyColdWalletRepositoryFactory(entityManager);

			await blockRepository.createQueryBuilder().insert().orIgnore().values(deferred.block).execute();

			await stateRepository
				.createQueryBuilder()
				.update()
				.set({
					blockNumber: deferred.block.number,
					supply: () => `supply + ${deferred.block.reward}`,
				})
				.where("id = :id", { id: 1 })
				.andWhere("blockNumber = :previousBlockNumber", {
					previousBlockNumber: BigNumber.make(deferred.block.number).minus(1).toFixed(),
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

			await configurationRepository
				.createQueryBuilder()
				.update()
				.set({
					version: this.app.version(),
					...(deferred.newMilestones ? { activeMilestones: deferred.newMilestones } : {}),
				})
				.where("id = :id", { id: 1 })
				.execute();

			for (const merge of deferred.mergedLegacyColdWallets) {
				await legacyColdwalletRepository
					.createQueryBuilder()
					.update()
					.set({
						mergeInfoTransactionHash: merge.txHash,
						mergeInfoWalletAddress: merge.address,
					})
					.where("address = :legacyAddress", { legacyAddress: merge.legacyAddress })
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
			-- legacy attributes are kept indefinitely
			'isLegacy', ("Wallet".attributes->>'isLegacy')::boolean,
			'secondPublicKey', "Wallet".attributes->>'secondPublicKey',
			'multiSignature', "Wallet".attributes->>'multiSignature',
			'legacyMerge', "Wallet".attributes->>'legacyMerge',

			-- if any unvote is present, it will overwrite the previous vote
			'vote',
			CASE
				WHEN EXCLUDED.attributes->>'unvote' IS NOT NULL THEN NULL
				ELSE COALESCE(EXCLUDED.attributes->>'vote', "Wallet".attributes->>'vote')
			END,

			-- if any username is present, it will overwrite the previous username
			'username',
			CASE
				WHEN (EXCLUDED.attributes->>'usernameResigned')::boolean IS TRUE THEN NULL
				ELSE COALESCE(EXCLUDED.attributes->>'username', "Wallet".attributes->>'username')
			END,

			'validatorPublicKey',
			COALESCE(EXCLUDED.attributes->>'validatorPublicKey', "Wallet".attributes->>'validatorPublicKey'),
			'validatorResigned',
			COALESCE(EXCLUDED.attributes->'validatorResigned', "Wallet".attributes->'validatorResigned'),
			'validatorVoteBalance',
			COALESCE((EXCLUDED.attributes->>'validatorVoteBalance')::text, ("Wallet".attributes->>'validatorVoteBalance')::text),
			'validatorVotersCount',
			COALESCE(EXCLUDED.attributes->'validatorVotersCount', "Wallet".attributes->'validatorVotersCount'),
			'validatorFee',
			COALESCE((EXCLUDED.attributes->>'validatorFee')::text, ("Wallet".attributes->>'validatorFee')::text),
			'validatorLastBlock',
			COALESCE((EXCLUDED.attributes->>'validatorLastBlock')::jsonb, ("Wallet".attributes->>'validatorLastBlock')::jsonb),
			'validatorForgedFees',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedFees')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedFees')::numeric, 0)::numeric)::text, '0'),
			'validatorForgedRewards',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedRewards')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedRewards')::numeric, 0)::numeric)::text, '0'),
			'validatorForgedTotal',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorForgedTotal')::numeric, 0)::numeric + COALESCE((EXCLUDED.attributes->>'validatorForgedTotal')::numeric, 0)::numeric)::text, '0'),
			'validatorProducedBlocks',
			NULLIF((COALESCE(("Wallet".attributes->>'validatorProducedBlocks')::integer, 0)::integer + COALESCE((EXCLUDED.attributes->>'validatorProducedBlocks')::integer, 0)::integer)::integer, 0)
					))`,
					parameters,
				);
			}

			await entityManager.query("SELECT update_validator_ranks();", []);
		});

		const t1 = performance.now();

		if (!this.state.isBootstrap()) {
			this.logger.debug(`synced commit: ${deferred.block.number} in ${t1 - t0}ms`);
		}
	}

	async #resetDatabaseIfNecessary(): Promise<void> {
		const genesisHeight = this.configuration.getGenesisHeight();
		const lastHeight = (await this.databaseService.isEmpty())
			? genesisHeight
			: (await this.databaseService.getLastCommit()).block.header.number;

		const [blocks] = await this.dataSource.query(
			"select coalesce(max(number), $1)::bigint as max_height, count(1) as count from blocks",
			[genesisHeight],
		);
		const blocksOk = blocks.count !== "0" && blocks.max_height === lastHeight.toFixed();

		const forcedTruncateDatabase = this.pluginConfiguration.getOptional<boolean>("truncateDatabase", false);
		this.logger.info(
			`checking for database reset (forced=${forcedTruncateDatabase}, db.blocks=${blocks.count}, db.height=${blocks.max_height}, storage.height=${lastHeight})`,
		);

		if (blocksOk && !forcedTruncateDatabase) {
			return;
		}

		if (lastHeight !== genesisHeight || blocks.count !== "0") {
			this.logger.warning(`Clearing API database for full restore.`);
		}

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = this.blockRepositoryFactory(entityManager);
			const contractRepository = this.contractRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const receiptRepository = this.receiptRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);
			const legacyColdwalletRepository = this.legacyColdWalletRepositoryFactory(entityManager);

			// Ensure all tables are truncated (already supposed to be idempotent, but it's cleaner)
			await Promise.all(
				[
					blockRepository,
					contractRepository,
					stateRepository,
					transactionRepository,
					receiptRepository,
					validatorRoundRepository,
					walletRepository,
					legacyColdwalletRepository,
				].map((repo) => repo.clear()),
			);
		});
	}
}

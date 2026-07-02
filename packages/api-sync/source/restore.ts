import type { Contracts } from "@mainsail/contracts";

import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import { parseTransactionError } from "@mainsail/evm-contracts";
import { assert, chunk, formatEcdsaSignature, validatorSetPack } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { TokenParser } from "./contracts.js";
import { Listeners } from "./listeners.js";
import { parseMultiPayments, parseUsernames } from "./parsers/index.js";

interface RepositoryContext {
	readonly entityManager: ApiDatabaseContracts.RepositoryDataSource;
	readonly blockRepository: ApiDatabaseContracts.BlockRepository;
	readonly configurationRepository: ApiDatabaseContracts.ConfigurationRepository;
	readonly contractRepository: ApiDatabaseContracts.ContractRepository;
	readonly stateRepository: ApiDatabaseContracts.StateRepository;
	readonly transactionRepository: ApiDatabaseContracts.TransactionRepository;
	readonly multiPaymentRepository: ApiDatabaseContracts.MultiPaymentRepository;
	readonly tokenRepository: ApiDatabaseContracts.TokenRepository;
	readonly tokenHolderRepository: ApiDatabaseContracts.TokenHolderRepository;
	readonly tokenActionRepository: ApiDatabaseContracts.TokenActionRepository;
	readonly validatorRoundRepository: ApiDatabaseContracts.ValidatorRoundRepository;
	readonly walletRepository: ApiDatabaseContracts.WalletRepository;
	readonly legacyColdWalletRepository: ApiDatabaseContracts.LegacyColdWalletRepository;
}

interface RestoreContext extends RepositoryContext {
	// lookups
	readonly addressToPublicKey: Record<string, string>;
	readonly publicKeyToAddress: Record<string, string>;
	readonly legacyAddresses: Set<string>;

	// metrics
	mostRecentCommit: Contracts.Crypto.Commit;

	lastBlockNumber: number;
	totalSupply: bigint;

	validatorAttributes: Record<string, ValidatorAttributes>;
	userAttributes: Record<string, UserAttributes>;

	validatorRounds: Record<number, Contracts.Shared.RoundInfo & { totalRound: number }>;
}

interface ValidatorAttributes {
	lastBlock?: Contracts.Crypto.BlockHeader;
	totalForgedFees: bigint;
	totalForgedRewards: bigint;
	producedBlocks: number;

	voteBalance: bigint;
	fee: bigint;
	votersCount: number;
	blsPublicKey: string;
	isResigned: boolean;
}

interface UserAttributes {
	username?: string;
	usernameFromContract?: boolean;
	vote?: string;
	legacyNonce?: bigint;
	legacyMerge?: Contracts.Evm.AccountMergeInfo;
}

@injectable()
export class Restore {
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

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.ApiSync.Logger)
	private readonly logger!: Contracts.ApiSync.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.ConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ContractRepositoryFactory)
	private readonly contractRepositoryFactory!: ApiDatabaseContracts.ContractRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	private readonly stateRepositoryFactory!: ApiDatabaseContracts.StateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.SystemRepositoryFactory)
	private readonly systemRepositoryFactory!: ApiDatabaseContracts.SystemRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.MultiPaymentRepositoryFactory)
	private readonly multiPaymentRepositoryFactory!: ApiDatabaseContracts.MultiPaymentRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
	private readonly tokenHolderRepositoryFactory!: ApiDatabaseContracts.TokenHolderRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenActionRepositoryFactory)
	private readonly tokenActionRepositoryFactory!: ApiDatabaseContracts.TokenActionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory)
	private readonly legacyColdWalletRepositoryFactory!: ApiDatabaseContracts.LegacyColdWalletRepositoryFactory;

	@inject(Identifiers.Evm.ContractService.Consensus)
	private readonly consensusContractService!: Contracts.Evm.ConsensusContractService;

	@inject(Identifiers.EvmConsensus.Contracts.MultiPayment)
	private readonly multiPaymentContractAddress!: string;

	@inject(Identifiers.EvmConsensus.Contracts.Usernames)
	private readonly usernameContractAddress!: string;

	@inject(Identifiers.ApiSync.TokenParser)
	private readonly tokenParser!: TokenParser;

	@inject(Identifiers.ApiSync.Listener)
	private readonly listeners!: Listeners;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotImporter?: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-sync")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	public async restore(): Promise<void> {
		const isEmpty = await this.databaseService.isEmpty();
		const mostRecentCommit = await (isEmpty
			? this.stateStore.getGenesisCommit()
			: this.databaseService.getLastCommit());

		const genesisBlockNumber = this.configuration.getGenesisHeight();
		const blocksToRestore = mostRecentCommit.block.number - genesisBlockNumber + 1;

		if (this.snapshotImporter) {
			const milestone = this.configuration.getMilestone(genesisBlockNumber);
			if (milestone.snapshot) {
				await this.snapshotImporter.prepareRestore();
			}
		}

		this.logger.info(
			`Performing database restore of ${blocksToRestore.toLocaleString()} blocks. this might take a while.`,
		);

		const t0 = performance.now();
		let restoredHeight = 0;

		await this.systemRepositoryFactory().setMaintenance(true);

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const context: RestoreContext = {
				addressToPublicKey: {},
				blockRepository: this.blockRepositoryFactory(entityManager),
				configurationRepository: this.configurationRepositoryFactory(entityManager),
				contractRepository: this.contractRepositoryFactory(entityManager),
				entityManager,
				lastBlockNumber: this.configuration.getGenesisHeight(),
				legacyAddresses: new Set(),
				legacyColdWalletRepository: this.legacyColdWalletRepositoryFactory(entityManager),
				mostRecentCommit,
				multiPaymentRepository: this.multiPaymentRepositoryFactory(entityManager),
				publicKeyToAddress: {},
				stateRepository: this.stateRepositoryFactory(entityManager),

				tokenActionRepository: this.tokenActionRepositoryFactory(entityManager),
				tokenHolderRepository: this.tokenHolderRepositoryFactory(entityManager),
				tokenRepository: this.tokenRepositoryFactory(entityManager),

				totalSupply: 0n,
				transactionRepository: this.transactionRepositoryFactory(entityManager),
				userAttributes: {},
				validatorAttributes: {},
				validatorRoundRepository: this.validatorRoundRepositoryFactory(entityManager),
				validatorRounds: {},
				walletRepository: this.walletRepositoryFactory(entityManager),
			};

			// The restore keeps a long-lived postgres transaction while it ingests all data.
			// Due to how data is laid out, the restore happens in several stages.

			// 1) All `validators` and `voters` from the consensus contract
			await this.#ingestConsensusData(context);

			// 2) All `commits` are read from the LMDB and written to:
			// - `blocks` table and `transactions` table respectively
			await this.#ingestBlocksAndTransactions(context);

			// 3) All `legacyColdWallets` are read from the EVM storage and written to:
			// - `legacy_cold_wallets` table
			await this.#ingestLegacyColdWallets(context);

			// 4) All `accounts` are read from the EVM storage and written to:
			// - `wallets` table
			await this.#ingestWallets(context);

			// 5) All `validator_rounds` are read from the EVM storage and written to:
			// - `validator_rounds` table
			await this.#ingestValidatorRounds(context);

			// 6) Write `configuration` table
			await this.#ingestConfiguration(context);

			// 7) Write `state` table
			await this.#ingestState(context);

			// 8) Write `contracts` table
			await this.#ingestContracts(context);

			// 9) Write captured data from plugins, configuration, etc.
			await this.listeners.flush(entityManager);

			restoredHeight = context.lastBlockNumber;
		});

		await this.migrations.runMigrations();

		const t1 = performance.now();

		await this.dataSource.transaction(async (entityManager) => {
			await entityManager.query("SET LOCAL statement_timeout = 0;");

			const context: RepositoryContext = {
				blockRepository: this.blockRepositoryFactory(entityManager),
				configurationRepository: this.configurationRepositoryFactory(entityManager),
				contractRepository: this.contractRepositoryFactory(entityManager),
				entityManager,
				legacyColdWalletRepository: this.legacyColdWalletRepositoryFactory(entityManager),
				multiPaymentRepository: this.multiPaymentRepositoryFactory(entityManager),
				stateRepository: this.stateRepositoryFactory(entityManager),
				tokenActionRepository: this.tokenActionRepositoryFactory(entityManager),
				tokenHolderRepository: this.tokenHolderRepositoryFactory(entityManager),
				tokenRepository: this.tokenRepositoryFactory(entityManager),
				transactionRepository: this.transactionRepositoryFactory(entityManager),
				validatorRoundRepository: this.validatorRoundRepositoryFactory(entityManager),
				walletRepository: this.walletRepositoryFactory(entityManager),
			};

			await this.#analyzeTables(context);
			await this.#updateValidatorRanks(context);
			await this.#updateWalletTokenCounts(context);
		});

		const t2 = performance.now();
		this.logger.info(`Analyzed tables in ${t2 - t1}ms`);

		this.logger.info(
			`Finished restore of ${(restoredHeight - genesisBlockNumber + 1).toLocaleString()} blocks in ${t2 - t0}ms`,
		);

		await this.systemRepositoryFactory().setMaintenance(false);
	}

	async #ingestBlocksAndTransactions(context: RestoreContext): Promise<void> {
		const {
			blockRepository,
			mostRecentCommit,
			multiPaymentRepository,
			tokenActionRepository: tokenTransferRepository,
			tokenHolderRepository,
			tokenRepository,
			transactionRepository,
			validatorRounds,
		} = context;

		const BATCH_SIZE = this.pluginConfiguration.getRequired<number>("restore.blocks.batchSize");
		const CHUNK_SIZE = BATCH_SIZE;
		const t0 = performance.now();

		const genesisBlockNumber = this.configuration.getGenesisHeight();
		let currentBlockNumber = genesisBlockNumber;

		let ingestedBlocks = 0;
		let ingestedTransactions = 0;
		let totalRound = 0;

		do {
			const fromBlockNumber = Math.min(currentBlockNumber, mostRecentCommit.block.number);
			const toBlockNumber = Math.min(currentBlockNumber + BATCH_SIZE - 1, mostRecentCommit.block.number);

			const commits = this.databaseService.readCommits(fromBlockNumber, toBlockNumber, Number.MAX_SAFE_INTEGER);

			// Prefetch every receipt for the batch in a single read
			const { receipts: batchReceipts } = await this.evm.getReceiptsByBlockRange(
				BigInt(fromBlockNumber),
				BigInt(toBlockNumber),
			);

			const receiptsByBlock = new Map<number, Record<string, Contracts.Evm.TransactionReceipt>>();
			for (const receipt of batchReceipts) {
				assert.defined(receipt.blockNumber);
				assert.defined(receipt.txHash);

				const blockNumber = Number(receipt.blockNumber);
				let blockReceipts = receiptsByBlock.get(blockNumber);
				if (!blockReceipts) {
					blockReceipts = {};
					receiptsByBlock.set(blockNumber, blockReceipts);
				}

				blockReceipts[receipt.txHash] = receipt;
			}

			const blocks: Models.Block[] = [];
			const transactions: Models.Transaction[] = [];
			const multiPayments: Models.MultiPayment[] = [];
			const tokens: Map<string, Models.Token> = new Map();
			const tokenHolders: Map<string, Models.TokenHolder> = new Map();
			const tokenActions: Models.TokenAction[] = [];

			const insertTransactions = async () => {
				if (transactions.length === 0) {
					return;
				}

				await transactionRepository.createQueryBuilder().insert().orIgnore().values(transactions).execute();

				transactions.length = 0;
			};

			const insertMultiPayments = async () => {
				if (multiPayments.length === 0) {
					return;
				}

				await multiPaymentRepository.createQueryBuilder().insert().orIgnore().values(multiPayments).execute();

				multiPayments.length = 0;
			};

			const insertTokens = async () => {
				if (tokens.size > 0) {
					await tokenRepository
						.createQueryBuilder()
						.insert()
						.orUpdate(["name", "symbol", "decimals", "total_supply"], ["address"])
						.values([...tokens.values()])
						.execute();

					tokens.clear();
				}

				if (tokenHolders.size > 0) {
					await tokenHolderRepository
						.createQueryBuilder()
						.insert()
						.orUpdate(["balance"], ["token_address", "address"])
						.values([...tokenHolders.values()])
						.execute();

					tokenHolders.clear();
				}

				if (tokenActions.length > 0) {
					await tokenTransferRepository
						.createQueryBuilder()
						.insert()
						.orIgnore()
						.values(tokenActions)
						.execute();

					tokenActions.length = 0;
				}
			};

			for await (const { block, proof } of commits) {
				blocks.push({
					commitRound: proof.round,
					fee: block.fee.toString(),
					gasUsed: block.gasUsed,
					hash: block.hash,
					number: block.number.toFixed(),
					parentHash: block.parentHash,
					payloadSize: block.payloadSize,
					proposer: block.proposer,
					reward: block.reward.toString(),
					round: block.round,
					signature: proof.signature,
					stateRoot: block.stateRoot,
					timestamp: block.timestamp.toFixed(),
					transactionsCount: block.transactionsCount,
					transactionsRoot: block.transactionsRoot,
					validatorRound: this.roundCalculator.calculateRound(block.number).round,
					validatorSet: validatorSetPack(proof.validators).toString(),
					version: block.version,
				});

				// Update block related validator attributes
				const validatorAttributes = context.validatorAttributes[block.proposer];
				if (!validatorAttributes) {
					if (block.number !== this.configuration.getGenesisHeight()) {
						throw new Error("unexpected validator");
					}
				} else {
					validatorAttributes.producedBlocks += 1;
					validatorAttributes.totalForgedFees += block.fee;
					validatorAttributes.totalForgedRewards += block.reward;
					validatorAttributes.lastBlock = block;
				}

				ingestedBlocks++;

				totalRound += block.round + 1;

				if (this.roundCalculator.isNewRound(block.number + 1)) {
					const nextRound = this.roundCalculator.calculateRound(block.number + 1);
					validatorRounds[nextRound.round] = { ...nextRound, totalRound };
				}

				// Handle transactions
				const receipts = receiptsByBlock.get(block.number) ?? {};

				for (const transaction of block.transactions) {
					const receipt = receipts[transaction.hash];
					assert.defined(receipt);

					const { senderPublicKey } = transaction;
					const parsedMultiPayments = parseMultiPayments(
						this.multiPaymentContractAddress,
						transaction,
						receipt,
					);
					const parsedUsernames = parseUsernames(this.usernameContractAddress, transaction, receipt);
					const {
						tokenActions: parsedTokenActions,
						tokenHolders: parsedTokenHolders,
						tokens: parsedTokens,
					} = await this.tokenParser.parseReceipt(block, transaction, receipt, tokenRepository);

					if (!context.publicKeyToAddress[senderPublicKey]) {
						const address = await this.addressFactory.fromPublicKey(senderPublicKey);
						context.publicKeyToAddress[senderPublicKey] = address;
						context.addressToPublicKey[address] = senderPublicKey;
					}

					for (const parsedUsername of parsedUsernames ?? []) {
						const userAttributes = context.userAttributes[parsedUsername.address] ?? {};

						context.userAttributes[parsedUsername.address] = {
							...userAttributes,
							username: parsedUsername.username,
							usernameFromContract: true,
						};
					}

					transactions.push({
						blockHash: block.hash,
						blockNumber: block.number.toFixed(),
						cumulativeGasUsed: Number(receipt.cumulativeGasUsed),

						data: transaction.data,

						decodedError: parseTransactionError(transaction, receipt),

						// Receipt data
						deployedContractAddress: receipt.contractAddress,

						from: transaction.from,

						gas: transaction.gasLimit,

						gasPrice: transaction.gasPrice,

						gasRefunded: Number(receipt.gasRefunded),

						gasUsed: Number(receipt.gasUsed),

						hash: transaction.hash,

						legacySecondSignature: transaction.legacySecondSignature,

						logs: receipt.logs as unknown as string, // is converted into JSONB column

						multiPaymentRecipients:
							parsedMultiPayments.length > 0
								? [...new Set(parsedMultiPayments.map((mp) => mp.to))]
								: undefined,

						nonce: transaction.nonce.toString(),

						output: receipt.output,
						senderPublicKey: transaction.senderPublicKey,
						signature: formatEcdsaSignature(transaction.r!, transaction.s!, transaction.v!),
						status: receipt.status,
						timestamp: block.timestamp.toFixed(),
						to: transaction.to,
						transactionIndex: transaction.transactionIndex!,
						value: transaction.value.toString(),
					});

					multiPayments.push(...parsedMultiPayments);
					tokenActions.push(...parsedTokenActions);

					for (const token of parsedTokens) {
						tokens.set(token.address, token);
					}

					for (const holder of parsedTokenHolders.filter((holder) => holder.balance !== "0")) {
						tokenHolders.set(`${holder.tokenAddress}-${holder.address}`, holder);
					}

					if (transactions.length >= CHUNK_SIZE) {
						await insertTransactions();
					}

					if (multiPayments.length >= CHUNK_SIZE) {
						await insertMultiPayments();
					}

					if (tokens.size + tokenHolders.size + tokenActions.length >= CHUNK_SIZE) {
						await insertTokens();
					}

					ingestedTransactions++;
				}

				block.transactions.length = 0;

				context.lastBlockNumber = block.number;
			}

			for (const batch of chunk(blocks, CHUNK_SIZE)) {
				await blockRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			await insertTransactions();
			await insertMultiPayments();
			await insertTokens();

			if (
				ingestedBlocks % (BATCH_SIZE * 10) === 0 ||
				currentBlockNumber + BATCH_SIZE > mostRecentCommit.block.number
			) {
				const t1 = performance.now();

				this.logger.info(
					`Restored blocks: ${ingestedBlocks.toLocaleString()} transactions: ${ingestedTransactions.toLocaleString()} elapsed: ${t1 - t0}ms`,
				);
				await new Promise<void>((resolve) => setImmediate(resolve)); // Log might stuck if this line is removed
			}

			currentBlockNumber += BATCH_SIZE;
		} while (currentBlockNumber <= mostRecentCommit.block.number);
	}

	async #ingestConsensusData(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const validators = await this.consensusContractService.getAllValidators();

		for (const validator of validators) {
			context.validatorAttributes[validator.address] = {
				blsPublicKey: validator.blsPublicKey,
				fee: validator.fee,
				isResigned: validator.isResigned,
				producedBlocks: 0,
				totalForgedFees: 0n,
				totalForgedRewards: 0n,
				voteBalance: validator.voteBalance,
				votersCount: validator.votersCount,
			};
		}

		let totalVotes = 0;
		for await (const votes of this.consensusContractService.getVotes()) {
			const userAttributes = context.userAttributes[votes.voterAddress] ?? {};

			context.userAttributes[votes.voterAddress] = {
				...userAttributes,
				vote: votes.validatorAddress,
			};
			totalVotes++;
		}

		const t1 = performance.now();
		this.logger.info(`Read ${validators.length} validators and ${totalVotes} votes from contract ${t1 - t0}ms`);
	}

	async #ingestWallets(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const BATCH_SIZE = 10000n;
		const CHUNK_SIZE = 2500;

		let offset: bigint | undefined = 0n;

		if (this.snapshotImporter) {
			for (const validator of this.snapshotImporter.validators) {
				const userAttributes = context.userAttributes[validator.ethAddress] ?? {};

				// Contract takes precedence over snapshot.
				if (userAttributes.usernameFromContract) {
					continue;
				}

				context.userAttributes[validator.ethAddress] = {
					...userAttributes,
					username: validator.username,
				};
			}

			for (const wallet of this.snapshotImporter.drain()) {
				// add any imported address to the mapping
				if (wallet.ethAddress && wallet.publicKey) {
					const userAttributes = context.userAttributes[wallet.ethAddress] ?? {};
					context.userAttributes[wallet.ethAddress] = {
						...userAttributes,
						legacyNonce: wallet.legacyAttributes.legacyNonce,
					};

					context.legacyAddresses.add(wallet.ethAddress);
					context.addressToPublicKey[wallet.ethAddress] = wallet.publicKey;
				}
			}
		}

		let totalAccountBalance = 0n;
		let totalAccounts = 0;

		do {
			const result = await this.evm.getAccounts(offset ?? 0n, BATCH_SIZE);
			const accounts: Models.Wallet[] = [];

			for (const account of result.accounts) {
				const validatorAttributes = context.validatorAttributes[account.address];
				const userAttributes = context.userAttributes[account.address];
				const { legacyAttributes } = account;

				accounts.push({
					address: account.address,
					attributes: {
						...(validatorAttributes
							? {
									validatorFee: validatorAttributes.fee.toString(),
									validatorPublicKey: validatorAttributes.blsPublicKey,
									validatorResigned: validatorAttributes.isResigned,
									validatorVoteBalance: validatorAttributes.voteBalance.toString(),
									validatorVotersCount: validatorAttributes.votersCount,

									...(validatorAttributes.totalForgedFees > 0n
										? { validatorForgedFees: validatorAttributes.totalForgedFees.toString() }
										: {}),
									...(validatorAttributes.totalForgedRewards > 0n
										? { validatorForgedRewards: validatorAttributes.totalForgedRewards.toString() }
										: {}),
									...(validatorAttributes.totalForgedFees + validatorAttributes.totalForgedRewards >
									0n
										? {
												validatorForgedTotal: (
													validatorAttributes.totalForgedFees +
													validatorAttributes.totalForgedRewards
												).toString(),
											}
										: {}),
									...(validatorAttributes.producedBlocks > 0
										? { validatorProducedBlocks: validatorAttributes.producedBlocks }
										: {}),
									...(validatorAttributes.lastBlock
										? {
												validatorLastBlock: {
													hash: validatorAttributes.lastBlock.hash,
													number: validatorAttributes.lastBlock.number,
													timestamp: validatorAttributes.lastBlock.timestamp,
												},
											}
										: {}),

									// updated at end of db transaction
									// - validatorRank
									// - validatorApproval
								}
							: {}),
						...(userAttributes
							? {
									...(userAttributes.username ? { username: userAttributes.username } : {}),
									...(userAttributes.vote ? { vote: userAttributes.vote } : {}),
									...(userAttributes.legacyNonce !== undefined
										? { legacyNonce: userAttributes.legacyNonce.toString() }
										: {}),
									...(userAttributes.legacyMerge
										? // merged legacy cold wallets
											{ isLegacy: true, legacyMerge: userAttributes.legacyMerge }
										: {}),
								}
							: {}),
						...(context.legacyAddresses.has(account.address)
							? {
									// all legacy non-cold wallets
									isLegacy: true,
								}
							: {}),
						...(legacyAttributes && Object.keys(legacyAttributes).length > 0
							? {
									...(legacyAttributes.legacyNonce !== undefined
										? { legacyNonce: legacyAttributes.legacyNonce.toString() }
										: {}),
									...(legacyAttributes.secondPublicKey
										? { secondPublicKey: legacyAttributes.secondPublicKey }
										: {}),
									...(legacyAttributes.multiSignature
										? { multiSignature: legacyAttributes.multiSignature }
										: {}),
								}
							: {}),
					} as string, // is converted into JSONB column
					balance: account.balance.toString(),
					nonce: account.nonce.toString(),
					publicKey: context.addressToPublicKey[account.address] ?? null,
					updated_at: "0",
				});

				totalAccounts++;
				totalAccountBalance += account.balance;
			}

			for (const batch of chunk(accounts, CHUNK_SIZE)) {
				await context.walletRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			offset = result.nextOffset;
		} while (offset);

		context.totalSupply += totalAccountBalance;

		const t1 = performance.now();
		this.logger.info(`Restored ${totalAccounts.toLocaleString()} wallets in ${t1 - t0}ms`);
	}

	async #ingestLegacyColdWallets(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const BATCH_SIZE = 10000n;
		const CHUNK_SIZE = 2500;
		let offset: bigint | undefined = 0n;

		let totalLegacyAccountBalance = 0n;
		let totalLegacyAccounts = 0;

		do {
			const result = await this.evm.getLegacyColdWallets(offset ?? 0n, BATCH_SIZE);

			const legacyColdWallets: Models.LegacyColdWallet[] = [];

			for (const wallet of result.wallets) {
				legacyColdWallets.push({
					address: wallet.address,
					balance: wallet.balance.toString(),
					...(Object.keys(wallet.legacyAttributes).length > 0
						? {
								attributes: {
									...wallet.legacyAttributes,
									...{ legacyNonce: wallet.legacyAttributes.legacyNonce?.toString() },
								},
							}
						: {}),
					mergeInfoTransactionHash: wallet.mergeInfo?.txHash,
					mergeInfoWalletAddress: wallet.mergeInfo?.address,
				} as Models.LegacyColdWallet);

				totalLegacyAccounts++;

				if (wallet.mergeInfo) {
					const userAttributes = context.userAttributes[wallet.mergeInfo.address] ?? {};

					context.userAttributes[wallet.mergeInfo.address] = {
						...userAttributes,
						legacyMerge: {
							address: wallet.address, // legacyAddress
							txHash: wallet.mergeInfo.txHash,
						},
					};
				} else {
					// Only add balance for total supply if unmerged, else it's already on the account info object.
					totalLegacyAccountBalance += wallet.balance;
				}
			}

			for (const batch of chunk(legacyColdWallets, CHUNK_SIZE)) {
				await context.legacyColdWalletRepository
					.createQueryBuilder()
					.insert()
					.orIgnore()
					.values(batch)
					.execute();
			}

			offset = result.nextOffset;
		} while (offset);

		context.totalSupply += totalLegacyAccountBalance;

		const t1 = performance.now();
		this.logger.info(`Restored ${totalLegacyAccounts.toLocaleString()} legacy cold wallets in ${t1 - t0}ms`);
	}

	async #ingestValidatorRounds(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const { validatorRoundRepository, validatorRounds } = context;

		let ingestedValidatorRounds = 0;
		let validatorRoundsToIngest: Models.ValidatorRound[] = [];

		const CHUNK_SIZE = 1000;

		const insert = async () => {
			if (validatorRoundsToIngest.length === 0) {
				return;
			}

			await validatorRoundRepository
				.createQueryBuilder()
				.insert()
				.orIgnore()
				.values(validatorRoundsToIngest)
				.execute();

			validatorRoundsToIngest = [];
		};

		for await (const { round, roundHeight, validators } of this.consensusContractService.getValidatorRounds()) {
			const validatorAddresses: string[] = Array.from({ length: validators.length });
			const votes: string[] = Array.from({ length: validators.length });

			for (let index = 0; index < validators.length; index++) {
				const validatorRound = validatorRounds[round];
				if (validatorRound.maxValidators !== validators.length) {
					throw new Error(
						`mismatch in expected (${validatorRound.maxValidators}) and actual (${validators.length}) validator count`,
					);
				}

				const proposerIndex = this.proposerCalculator.getValidatorIndexFrom(
					validatorRound.maxValidators,
					validatorRound.totalRound,
					index,
				);

				const proposer = validators[proposerIndex];
				validatorAddresses[index] = proposer.address;
				votes[index] = proposer.voteBalance.toString();
			}

			validatorRoundsToIngest.push({
				round,
				roundHeight,
				validators: validatorAddresses,
				votes,
			});
			ingestedValidatorRounds += 1;

			if (validatorRoundsToIngest.length === CHUNK_SIZE) {
				await insert();
			}
		}

		await insert();

		const t1 = performance.now();
		this.logger.info(`Restored ${ingestedValidatorRounds.toLocaleString()} validator rounds in ${t1 - t0}ms`);
	}

	async #ingestConfiguration(context: RestoreContext): Promise<void> {
		await context.configurationRepository
			.createQueryBuilder()
			.insert()
			.values({
				activeMilestones: this.configuration.getMilestone(context.lastBlockNumber + 1),
				cryptoConfiguration: this.configuration.all() ?? {},
				id: 1,
				version: this.app.version(),
			})
			.orUpdate(["crypto_configuration", "version"], ["id"])
			.execute();
	}

	async #ingestState(context: RestoreContext): Promise<void> {
		await context.stateRepository
			.createQueryBuilder()
			.insert()
			.orIgnore()
			.values({
				blockNumber: context.lastBlockNumber.toFixed(),
				id: 1,
				supply: context.totalSupply.toString(),
			})
			.execute();
	}

	async #ingestContracts(context: RestoreContext): Promise<void> {
		// const deploymentEvents = this.app
		// 	.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer)
		// 	.getDeploymentEvents();
		// await context.contractRepository
		// 	.createQueryBuilder()
		// 	.insert()
		// 	.orIgnore()
		// 	.values(
		// 		deploymentEvents.map((event) => ({
		// 			activeImplementation: event.activeImplementation ?? event.address,
		// 			address: event.address,
		// 			implementations: event.implementations,
		// 			name: event.name,
		// 			proxy: event.proxy,
		// 		})) as unknown as { address: string; abi: Record<string, unknown> }[],
		// 	)
		// 	.execute();
	}

	async #updateValidatorRanks(context: RepositoryContext): Promise<void> {
		await context.entityManager.query("SELECT update_validator_ranks();", []);
	}

	async #updateWalletTokenCounts(context: RepositoryContext): Promise<void> {
		await context.entityManager.query("SELECT update_wallet_token_counts();", []);
	}

	async #analyzeTables({
		blockRepository,
		configurationRepository,
		contractRepository,
		legacyColdWalletRepository,
		multiPaymentRepository,
		stateRepository,
		tokenHolderRepository,
		tokenRepository,
		transactionRepository,
		validatorRoundRepository,
		walletRepository,
	}: RepositoryContext): Promise<void> {
		for (const repository of [
			blockRepository,
			contractRepository,
			stateRepository,
			transactionRepository,
			validatorRoundRepository,
			walletRepository,
			legacyColdWalletRepository,
			multiPaymentRepository,
			tokenRepository,
			tokenHolderRepository,
			configurationRepository,
		]) {
			await repository.query(`ANALYZE ${repository.metadata.tableName}`);
		}
	}
}

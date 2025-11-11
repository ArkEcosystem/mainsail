import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional, tagged } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Deployer, Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { parseTransactionError } from "@mainsail/evm-contracts";
import { assert, BigNumber, chunk, formatEcdsaSignature, validatorSetPack } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { parseMultiPayments, parseUsernames } from "./parsers/index.js";

interface RestoreContext {
	readonly entityManager: ApiDatabaseContracts.RepositoryDataSource;
	readonly blockRepository: ApiDatabaseContracts.BlockRepository;
	readonly configurationRepository: ApiDatabaseContracts.ConfigurationRepository;
	readonly contractRepository: ApiDatabaseContracts.ContractRepository;
	readonly stateRepository: ApiDatabaseContracts.StateRepository;
	readonly transactionRepository: ApiDatabaseContracts.TransactionRepository;
	readonly multiPaymentRepository: ApiDatabaseContracts.MultiPaymentRepository;
	readonly validatorRoundRepository: ApiDatabaseContracts.ValidatorRoundRepository;
	readonly walletRepository: ApiDatabaseContracts.WalletRepository;
	readonly legacyColdWalletRepository: ApiDatabaseContracts.LegacyColdWalletRepository;

	// lookups
	readonly addressToPublicKey: Record<string, string>;
	readonly publicKeyToAddress: Record<string, string>;
	readonly legacyAddresses: Set<string>;

	// metrics
	mostRecentCommit: Contracts.Crypto.Commit;

	lastBlockNumber: number;
	totalSupply: BigNumber;

	validatorAttributes: Record<string, ValidatorAttributes>;
	userAttributes: Record<string, UserAttributes>;
}

interface ValidatorAttributes {
	lastBlock?: Contracts.Crypto.BlockHeader;
	totalForgedFees: BigNumber;
	totalForgedRewards: BigNumber;
	producedBlocks: number;

	voteBalance: BigNumber;
	fee: BigNumber;
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

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

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

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory)
	private readonly legacyColdWalletRepositoryFactory!: ApiDatabaseContracts.LegacyColdWalletRepositoryFactory;

	@inject(Identifiers.Evm.ContractService.Consensus)
	private readonly consensusContractService!: Contracts.Evm.ConsensusContractService;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotImporter?: Contracts.Snapshot.LegacyImporter;

	public async restore(): Promise<void> {
		if (this.snapshotImporter) {
			await this.snapshotImporter.prepareRestore();
		}

		const isEmpty = await this.databaseService.isEmpty();
		const mostRecentCommit = await (isEmpty
			? this.stateStore.getGenesisCommit()
			: this.databaseService.getLastCommit());

		const genesisBlockNumber = this.configuration.getGenesisHeight();
		const blocksToRestore = mostRecentCommit.block.header.number - genesisBlockNumber + 1;

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
				totalSupply: BigNumber.ZERO,
				transactionRepository: this.transactionRepositoryFactory(entityManager),
				userAttributes: {},
				validatorAttributes: {},
				validatorRoundRepository: this.validatorRoundRepositoryFactory(entityManager),
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

			restoredHeight = context.lastBlockNumber;
		});

		await this.migrations.runMigrations();

		const t1 = performance.now();

		await this.dataSource.transaction(async (entityManager) => {
			await entityManager.query("SET LOCAL statement_timeout = 0;");

			const context: RestoreContext = {
				blockRepository: this.blockRepositoryFactory(entityManager),
				configurationRepository: this.configurationRepositoryFactory(entityManager),
				contractRepository: this.contractRepositoryFactory(entityManager),
				entityManager,
				legacyColdWalletRepository: this.legacyColdWalletRepositoryFactory(entityManager),
				multiPaymentRepository: this.multiPaymentRepositoryFactory(entityManager),
				stateRepository: this.stateRepositoryFactory(entityManager),
				transactionRepository: this.transactionRepositoryFactory(entityManager),
				validatorRoundRepository: this.validatorRoundRepositoryFactory(entityManager),
				walletRepository: this.walletRepositoryFactory(entityManager),
			} as any;

			await this.#analyzeTables(context);
			await this.#updateValidatorRanks(context);
		});

		const t2 = performance.now();
		this.logger.info(`Analyzed tables in ${t2 - t1}ms`);

		this.logger.info(
			`Finished restore of ${(restoredHeight - genesisBlockNumber + 1).toLocaleString()} blocks in ${t2 - t0}ms`,
		);

		await this.systemRepositoryFactory().setMaintenance(false);
	}

	async #ingestBlocksAndTransactions(context: RestoreContext): Promise<void> {
		const { blockRepository, transactionRepository, multiPaymentRepository, mostRecentCommit } = context;

		const BATCH_SIZE = 1000;
		const CHUNK_SIZE = 1000;
		const t0 = performance.now();

		const genesisBlockNumber = this.configuration.getGenesisHeight();
		let currentBlockNumber = genesisBlockNumber;

		let ingestedBlocks = 0;
		let ingestedTransactions = 0;

		const multiPaymentContractAddress = this.app.get<string>(
			EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment,
		);

		const usernameContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Usernames);

		do {
			const fromBlockNumber = Math.min(currentBlockNumber, mostRecentCommit.block.header.number);
			const toBlockNumber = Math.min(currentBlockNumber + BATCH_SIZE - 1, mostRecentCommit.block.header.number);

			const commits = this.databaseService.readCommits(fromBlockNumber, toBlockNumber);

			const blocks: Models.Block[] = [];
			const transactions: Models.Transaction[] = [];
			const multiPayments: Models.MultiPayment[] = [];

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

			for await (const { proof, block } of commits) {
				blocks.push({
					commitRound: proof.round,
					fee: block.header.fee.toFixed(),
					gasUsed: block.header.gasUsed,
					hash: block.header.hash,
					number: block.header.number.toFixed(),
					parentHash: block.header.parentHash,
					payloadSize: block.header.payloadSize,
					proposer: block.header.proposer,
					reward: block.header.reward.toFixed(),
					round: block.header.round,
					signature: proof.signature,
					stateRoot: block.header.stateRoot,
					timestamp: block.header.timestamp.toFixed(),
					transactionsCount: block.header.transactionsCount,
					transactionsRoot: block.header.transactionsRoot,
					validatorRound: this.roundCalculator.calculateRound(block.header.number).round,
					validatorSet: validatorSetPack(proof.validators).toString(),
					version: block.header.version,
				});

				// Update block related validator attributes
				const validatorAttributes = context.validatorAttributes[block.header.proposer];
				if (!validatorAttributes) {
					if (block.header.number !== this.configuration.getGenesisHeight()) {
						throw new Error("unexpected validator");
					}
				} else {
					validatorAttributes.producedBlocks += 1;
					validatorAttributes.totalForgedFees = validatorAttributes.totalForgedFees.plus(block.header.fee);
					validatorAttributes.totalForgedRewards = validatorAttributes.totalForgedFees.plus(
						block.header.reward,
					);
					validatorAttributes.lastBlock = block.header;
				}

				ingestedBlocks++;

				// Handle transactions
				const receipts = await this.evm.getReceiptsByBlockNumber(BigInt(block.header.number));

				for (const transaction of block.transactions) {
					const receipt = receipts[transaction.hash];
					assert.defined(receipt);

					const { data } = transaction;
					const { senderPublicKey } = data;
					const parsedMultiPayments = parseMultiPayments(multiPaymentContractAddress, transaction, receipt);
					const parsedUsernames = parseUsernames(usernameContractAddress, transaction, receipt);

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
						blockHash: block.header.hash,
						blockNumber: block.header.number.toFixed(),
						data: data.data,

						decodedError: parseTransactionError(transaction, receipt),

						// Receipt data
						deployedContractAddress: receipt.contractAddress,

						from: data.from,

						gas: data.gasLimit,

						gasPrice: data.gasPrice,

						gasRefunded: Number(receipt.gasRefunded),

						gasUsed: Number(receipt.gasUsed),

						hash: data.hash,

						legacySecondSignature: data.legacySecondSignature,

						logs: receipt.logs,

						multiPaymentRecipients:
							parsedMultiPayments.length > 0
								? [...new Set(parsedMultiPayments.map((mp) => mp.to))]
								: undefined,

						nonce: data.nonce.toFixed(),

						output: receipt.output,
						senderPublicKey: data.senderPublicKey,
						signature: formatEcdsaSignature(data.r!, data.s!, data.v!),
						status: receipt.status,
						timestamp: block.header.timestamp.toFixed(),
						to: data.to,
						transactionIndex: data.transactionIndex!,
						value: data.value.toFixed(),
					});

					multiPayments.push(...parsedMultiPayments);

					if (transactions.length >= CHUNK_SIZE) {
						await insertTransactions();
					}

					if (multiPayments.length >= CHUNK_SIZE) {
						await insertMultiPayments();
					}

					ingestedTransactions++;
				}

				block.transactions.length = 0;

				context.lastBlockNumber = block.header.number;
			}

			for (const batch of chunk(blocks, CHUNK_SIZE)) {
				await blockRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			await insertTransactions();
			await insertMultiPayments();

			if (
				ingestedBlocks % (BATCH_SIZE * 10) === 0 ||
				currentBlockNumber + BATCH_SIZE > mostRecentCommit.block.header.number
			) {
				const t1 = performance.now();

				this.logger.info(
					`Restored blocks: ${ingestedBlocks.toLocaleString()} transactions: ${ingestedTransactions.toLocaleString()} elapsed: ${t1 - t0}ms`,
				);
				await new Promise<void>((resolve) => setImmediate(resolve)); // Log might stuck if this line is removed
			}

			currentBlockNumber += BATCH_SIZE;
		} while (currentBlockNumber <= mostRecentCommit.block.header.number);
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
				totalForgedFees: BigNumber.ZERO,
				totalForgedRewards: BigNumber.ZERO,
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
									validatorFee: validatorAttributes.fee,
									validatorForgedFees: validatorAttributes.totalForgedFees.toFixed(),
									validatorForgedRewards: validatorAttributes.totalForgedRewards.toFixed(),
									validatorForgedTotal: validatorAttributes.totalForgedFees
										.plus(validatorAttributes.totalForgedRewards)
										.toFixed(),
									validatorLastBlock: validatorAttributes.lastBlock
										? {
												hash: validatorAttributes.lastBlock.hash,
												number: validatorAttributes.lastBlock.number,
												timestamp: validatorAttributes.lastBlock.timestamp,
											}
										: {},
									validatorProducedBlocks: validatorAttributes.producedBlocks,
									validatorPublicKey: validatorAttributes.blsPublicKey,
									validatorResigned: validatorAttributes.isResigned,
									validatorVoteBalance: validatorAttributes.voteBalance,
									validatorVotersCount: validatorAttributes.votersCount,

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
					},
					balance: BigNumber.make(account.balance).toFixed(),
					nonce: BigNumber.make(account.nonce).toFixed(),
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

		context.totalSupply = context.totalSupply.plus(totalAccountBalance);

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
					balance: BigNumber.make(wallet.balance).toFixed(),
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
				});

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

		context.totalSupply = context.totalSupply.plus(totalLegacyAccountBalance);

		const t1 = performance.now();
		this.logger.info(`Restored ${totalLegacyAccounts.toLocaleString()} legacy cold wallets in ${t1 - t0}ms`);
	}

	async #ingestValidatorRounds(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		let totalRounds = 0;
		let validatorRounds: Models.ValidatorRound[] = [];

		const CHUNK_SIZE = 1000;

		const insert = async () => {
			if (validatorRounds.length === 0) {
				return;
			}

			await context.validatorRoundRepository
				.createQueryBuilder()
				.insert()
				.orIgnore()
				.values(validatorRounds)
				.execute();

			validatorRounds = [];
		};

		for await (const { round, roundHeight, validators } of this.consensusContractService.getValidatorRounds()) {
			const validatorAddresses: string[] = [];
			const votes: string[] = [];

			for (const validator of validators) {
				validatorAddresses.push(validator.address);
				votes.push(validator.voteBalance.toFixed());
			}

			validatorRounds.push({
				round,
				roundHeight,
				validators: validatorAddresses,
				votes,
			});
			totalRounds += 1;

			if (validatorRounds.length === CHUNK_SIZE) {
				await insert();
			}
		}

		await insert();

		const t1 = performance.now();
		this.logger.info(`Restored ${totalRounds.toLocaleString()} validator rounds in ${t1 - t0}ms`);
	}

	async #ingestConfiguration(context: RestoreContext): Promise<void> {
		await context.configurationRepository
			.createQueryBuilder()
			.insert()
			.values({
				activeMilestones: this.configuration.getMilestone(context.lastBlockNumber) as Record<string, any>,
				cryptoConfiguration: (this.configuration.all() ?? {}) as Record<string, any>,
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
				supply: context.totalSupply.toFixed(),
			})
			.execute();
	}

	async #ingestContracts(context: RestoreContext): Promise<void> {
		const deploymentEvents = this.app
			.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer)
			.getDeploymentEvents();

		await context.contractRepository
			.createQueryBuilder()
			.insert()
			.orIgnore()
			.values(
				deploymentEvents.map((event) => ({
					activeImplementation: event.activeImplementation ?? event.address,
					address: event.address,
					implementations: event.implementations,
					name: event.name,
					proxy: event.proxy,
				})),
			)
			.execute();
	}

	async #updateValidatorRanks(context: RestoreContext): Promise<void> {
		await context.entityManager.query("SELECT update_validator_ranks();", []);
	}

	async #analyzeTables({
		blockRepository,
		contractRepository,
		stateRepository,
		transactionRepository,
		walletRepository,
		legacyColdWalletRepository,
		multiPaymentRepository,
		configurationRepository,
		validatorRoundRepository,
	}: RestoreContext): Promise<void> {
		await Promise.all(
			[
				blockRepository,
				contractRepository,
				stateRepository,
				transactionRepository,
				validatorRoundRepository,
				walletRepository,
				legacyColdWalletRepository,
				multiPaymentRepository,
				configurationRepository,
			].map((repo) => repo.query(`ANALYZE ${repo.metadata.tableName}`)),
		);
	}
}

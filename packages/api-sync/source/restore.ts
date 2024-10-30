import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { chunk, validatorSetPack } from "@mainsail/utils";
import { performance } from "perf_hooks";

interface RestoreContext {
	readonly entityManager: ApiDatabaseContracts.RepositoryDataSource;
	readonly blockRepository: ApiDatabaseContracts.BlockRepository;
	readonly configurationRepository: ApiDatabaseContracts.ConfigurationRepository;
	readonly stateRepository: ApiDatabaseContracts.StateRepository;
	readonly transactionRepository: ApiDatabaseContracts.TransactionRepository;
	readonly transactionTypeRepository: ApiDatabaseContracts.TransactionTypeRepository;
	readonly receiptRepository: ApiDatabaseContracts.ReceiptRepository;
	readonly validatorRoundRepository: ApiDatabaseContracts.ValidatorRoundRepository;
	readonly walletRepository: ApiDatabaseContracts.WalletRepository;

	// lookups
	readonly addressToPublicKey: Record<string, string>;
	readonly publicKeyToAddress: Record<string, string>;

	// metrics
	mostRecentCommit: Contracts.Crypto.Commit;

	lastHeight: number;
	totalSupply: Utils.BigNumber;

	validatorAttributes: Record<string, ValidatorAttributes>;
	userAttributes: Record<string, UserAttributes>;
}

interface ValidatorAttributes {
	lastBlock?: Contracts.Crypto.BlockHeader;
	totalForgedFees: Utils.BigNumber;
	totalForgedRewards: Utils.BigNumber;
	producedBlocks: number;

	voteBalance: Utils.BigNumber;
	votersCount: number;
	blsPublicKey: string;
	isResigned: boolean;
}

interface UserAttributes {
	vote?: string;
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

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

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

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly transactionHandlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.WalletRepositoryFactory;

	@inject(Identifiers.Evm.ContractService.Consensus)
	private readonly consensusContractService!: Contracts.Evm.ConsensusContractService;

	public async restore(): Promise<void> {
		const mostRecentCommit = await this.databaseService.getLastCommit();
		Utils.assert.defined<Contracts.Crypto.Commit>(mostRecentCommit);

		this.logger.info(
			`Performing database restore of ${mostRecentCommit.block.header.height.toLocaleString()} blocks. this might take a while.`,
		);

		const t0 = performance.now();
		let restoredHeight = 0;

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const context: RestoreContext = {
				addressToPublicKey: {},
				blockRepository: this.blockRepositoryFactory(entityManager),
				configurationRepository: this.configurationRepositoryFactory(entityManager),
				entityManager,
				lastHeight: 0,
				mostRecentCommit,
				publicKeyToAddress: {},
				receiptRepository: this.receiptRepositoryFactory(entityManager),
				stateRepository: this.stateRepositoryFactory(entityManager),

				totalSupply: Utils.BigNumber.ZERO,

				transactionRepository: this.transactionRepositoryFactory(entityManager),
				transactionTypeRepository: this.transactionTypeRepositoryFactory(entityManager),
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

			// 3) All `accounts` are read from the EVM storage and written to:
			// - `wallets` table (NOTE: this does not include attributes yet)
			await this.#ingestWallets(context);

			// 4) All `receipts` are read from the EVM storage and written to:
			// - `receipts` table
			await this.#ingestReceipts(context);

			// 5) All `validator_rounds` are read from the EVM storage and written to:
			// - `validator_rounds` table
			await this.#ingestValidatorRounds(context);

			// 6) Write `transction_types` table
			await this.#ingestTransactionTypes(context);

			// 7) Write `configuration` table
			await this.#ingestConfiguration(context);

			// 8) Write `state` table
			await this.#ingestState(context);

			// 9) Update validator ranks
			await this.#updateValidatorRanks(context);

			restoredHeight = context.lastHeight;
		});

		const t1 = performance.now();
		this.logger.info(`Finished restore of ${restoredHeight.toLocaleString()} blocks in ${t1 - t0}ms`);
	}

	async #ingestBlocksAndTransactions(context: RestoreContext): Promise<void> {
		const { blockRepository, transactionRepository, mostRecentCommit } = context;

		const BATCH_SIZE = 1000;
		const t0 = performance.now();

		let currentHeight = 0;

		do {
			const commits = await this.databaseService.findCommits(
				Math.min(currentHeight, mostRecentCommit.block.header.height),
				Math.min(currentHeight + BATCH_SIZE, mostRecentCommit.block.header.height),
			);

			const blocks: Models.Block[] = [];
			const transactions: Models.Transaction[] = [];

			for (const { proof, block } of commits) {
				blocks.push({
					commitRound: proof.round,
					generatorAddress: block.header.generatorAddress,
					height: block.header.height.toFixed(),
					id: block.header.id,
					numberOfTransactions: block.header.numberOfTransactions,
					payloadHash: block.header.payloadHash,
					payloadLength: block.header.payloadLength,
					previousBlock: block.header.previousBlock,
					reward: block.header.reward.toFixed(),
					round: block.header.round,
					signature: proof.signature,
					stateHash: block.header.stateHash,
					timestamp: block.header.timestamp.toFixed(),
					totalAmount: block.header.totalAmount.toFixed(),
					totalFee: block.header.totalFee.toFixed(),
					totalGasUsed: block.header.totalGasUsed,
					validatorRound: Utils.roundCalculator.calculateRound(block.header.height, this.configuration).round,
					validatorSet: validatorSetPack(proof.validators).toString(),
					version: block.header.version,
				});

				// Update block related validator attributes
				const validatorAttributes = context.validatorAttributes[block.header.generatorAddress];
				if (!validatorAttributes) {
					if (block.header.height !== 0) {
						throw new Error("unexpected validator");
					}
				} else {
					validatorAttributes.producedBlocks += 1;
					validatorAttributes.totalForgedFees = validatorAttributes.totalForgedFees.plus(
						block.header.totalFee,
					);
					validatorAttributes.totalForgedRewards = validatorAttributes.totalForgedFees.plus(
						block.header.reward,
					);
					validatorAttributes.lastBlock = block.header;
				}

				// Handle transactions
				for (const { data } of block.transactions) {
					const { senderPublicKey } = data;
					if (!context.publicKeyToAddress[senderPublicKey]) {
						const address = await this.addressFactory.fromPublicKey(senderPublicKey);
						context.publicKeyToAddress[senderPublicKey] = address;
						context.addressToPublicKey[address] = senderPublicKey;
					}

					transactions.push({
						amount: data.value.toFixed(),
						blockHeight: block.header.height.toFixed(),
						blockId: block.header.id,
						data: data.data,
						gasLimit: data.gasLimit,
						gasPrice: data.gasPrice,
						id: data.id as unknown as string,
						nonce: data.nonce.toFixed(),
						recipientAddress: data.recipientAddress,
						senderAddress: data.senderAddress,
						senderPublicKey: data.senderPublicKey,
						sequence: data.sequence as unknown as number,
						signature: data.signature,
						signatures: undefined, //data.signatures,
						timestamp: block.header.timestamp.toFixed(),
					});
				}

				context.lastHeight = block.header.height;
				context.totalSupply = context.totalSupply.plus(block.header.totalAmount.plus(block.header.totalFee));
			}

			// too large queries are not good for postgres
			for (const batch of chunk(blocks, 256)) {
				await blockRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			// batch insert 'transactions' separately from 'blocks', given that we will be consistent at the end of the db transaction anyway.
			for (const batch of chunk(transactions, 256)) {
				await transactionRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			if (currentHeight % 10_000 === 0 || currentHeight + BATCH_SIZE > mostRecentCommit.block.header.height) {
				const t1 = performance.now();
				this.logger.info(`Restored blocks: ${context.lastHeight.toLocaleString()} elapsed: ${t1 - t0}ms`);
				await new Promise<void>((resolve) => setImmediate(resolve)); // Log might stuck if this line is removed
			}

			currentHeight += BATCH_SIZE;
		} while (currentHeight <= mostRecentCommit.block.header.height);
	}

	async #ingestConsensusData(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		// Consensus.sol#getAllValidators
		const validators = this.validatorSet.getAllValidators();

		for (const validator of validators) {
			context.validatorAttributes[validator.address] = {
				blsPublicKey: validator.blsPublicKey,
				isResigned: validator.isResigned,
				producedBlocks: 0,
				totalForgedFees: Utils.BigNumber.ZERO,
				totalForgedRewards: Utils.BigNumber.ZERO,
				voteBalance: validator.voteBalance,
				votersCount: validator.votersCount,
			};
		}

		let totalVotes = 0;
		for await (const votes of this.consensusContractService.getVotes()) {
			context.userAttributes[votes.voterAddress] = {
				vote: votes.validatorAddress,
			};
			totalVotes++;
		}

		const t1 = performance.now();
		this.logger.info(`Read ${validators.length} validators and ${totalVotes} votes from contract ${t1 - t0}ms`);
	}

	async #ingestWallets(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const BATCH_SIZE = 1000n;
		let offset: bigint | undefined = 0n;

		const accounts: Models.Wallet[] = [];

		do {
			const result = await this.evm.getAccounts(offset ?? 0n, BATCH_SIZE);

			for (const account of result.accounts) {
				const validatorAttributes = context.validatorAttributes[account.address];
				const userAttributes = context.userAttributes[account.address];

				accounts.push({
					address: account.address,
					attributes: {
						...(validatorAttributes
							? {
									validatorForgedFees: validatorAttributes.totalForgedFees.toFixed(),
									validatorForgedRewards: validatorAttributes.totalForgedRewards.toFixed(),
									validatorForgedTotal: validatorAttributes.totalForgedFees
										.plus(validatorAttributes.totalForgedRewards)
										.toFixed(),
									validatorLastBlock: validatorAttributes.lastBlock
										? {
												height: validatorAttributes.lastBlock.height,
												id: validatorAttributes.lastBlock.id,
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
									vote: userAttributes.vote,
								}
							: {}),
					},
					balance: Utils.BigNumber.make(account.balance).toFixed(),
					nonce: Utils.BigNumber.make(account.nonce).toFixed(),
					publicKey: context.addressToPublicKey[account.address] ?? "",
					updated_at: "0",
				});
			}

			offset = result.nextOffset;
		} while (offset);

		for (const batch of chunk(accounts, 256)) {
			await context.walletRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
		}

		const t1 = performance.now();
		this.logger.info(`Restored ${accounts.length.toLocaleString()} wallets in ${t1 - t0}ms`);
	}

	async #ingestReceipts(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		const BATCH_SIZE = 1000n;
		let offset: bigint | undefined = 0n;

		let totalReceipts = 0;

		do {
			const receipts: Models.Receipt[] = [];
			const result = await this.evm.getReceipts(offset ?? 0n, BATCH_SIZE);

			for (const receipt of result.receipts) {
				Utils.assert.defined(receipt.txHash);
				Utils.assert.defined(receipt.blockHeight);

				receipts.push({
					blockHeight: Utils.BigNumber.make(receipt.blockHeight).toFixed(),
					deployedContractAddress: receipt.deployedContractAddress,
					gasRefunded: Number(receipt.gasRefunded),
					gasUsed: Number(receipt.gasUsed),
					id: receipt.txHash,
					logs: receipt.logs,
					output: receipt.output,
					success: receipt.success,
				});
			}

			for (const batch of chunk(receipts, 256)) {
				await context.receiptRepository.createQueryBuilder().insert().orIgnore().values(batch).execute();
			}

			offset = result.nextOffset;
			totalReceipts += receipts.length;
		} while (offset);

		const t1 = performance.now();
		this.logger.info(`Restored ${totalReceipts.toLocaleString()} receipts in ${t1 - t0}ms`);
	}

	async #ingestValidatorRounds(context: RestoreContext): Promise<void> {
		const t0 = performance.now();

		let totalRounds = 0;
		let validatorRounds: Models.ValidatorRound[] = [];

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

			if (validatorRounds.length === 256) {
				await insert();
			}
		}

		await insert();

		const t1 = performance.now();
		this.logger.info(`Restored ${totalRounds.toLocaleString()} validator rounds in ${t1 - t0}ms`);
	}

	async #ingestTransactionTypes(context: RestoreContext): Promise<void> {
		const transactionHandlers = await this.transactionHandlerRegistry.getActivatedHandlers();

		const types: Models.TransactionType[] = [];

		for (const handler of transactionHandlers) {
			const constructor = handler.getConstructor();

			const key: string | undefined = constructor.key;

			Utils.assert.defined<string>(key);

			types.push({ key, schema: constructor.getSchema().properties });
		}

		types.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }));

		await context.transactionTypeRepository.upsert(types, ["key"]);
	}

	async #ingestConfiguration(context: RestoreContext): Promise<void> {
		await context.configurationRepository
			.createQueryBuilder()
			.insert()
			.values({
				activeMilestones: this.configuration.getMilestone(context.lastHeight) as Record<string, any>,
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
				height: context.lastHeight.toFixed(),
				id: 1,
				supply: context.totalSupply.toFixed(),
			})
			.execute();
	}

	async #updateValidatorRanks(context: RestoreContext): Promise<void> {
		await context.entityManager.query("SELECT update_validator_ranks();", []);
	}
}

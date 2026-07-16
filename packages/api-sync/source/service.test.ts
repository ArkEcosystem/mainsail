import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Sync } from "./service.js";

const PROPOSER = "0xproposer";
const SENDER_PUBLIC_KEY = "02aabbcc";
const SENDER = "0xsender";

// Chainable TypeORM query-builder fake that records every call.
const makeQb = () => {
	const calls: Record<string, any[][]> = {};
	const record = (method: string, args: any[]) => {
		(calls[method] ??= []).push(args);
	};

	const qb: any = { calls };
	for (const method of ["insert", "orIgnore", "orUpdate", "update", "set", "values", "where", "andWhere"]) {
		qb[method] = (...args: any[]) => {
			record(method, args);
			return qb;
		};
	}
	qb.execute = async () => {
		record("execute", []);
	};

	return qb;
};

const makeRepo = () => {
	const qb = makeQb();
	const repo: any = {
		createQueryBuilder: () => qb,
		qb,
		queries: [] as any[][],
		removed: [] as any[],
	};
	repo.query = async (...args: any[]) => {
		repo.queries.push(args);
	};
	repo.remove = async (entities: any[]) => {
		repo.removed.push(entities);
	};
	return repo;
};

const makeHeader = () => ({
	fee: 100n,
	gasUsed: 21_000,
	hash: "0xblockhash",
	number: 1,
	parentHash: "0xparent",
	payloadSize: 10,
	proposer: PROPOSER,
	reward: 200n,
	round: 0,
	stateRoot: "0xstateroot",
	timestamp: 1_720_000_000,
	transactionsCount: 1,
	transactionsRoot: "0xtxroot",
	version: 1,
});

const makeTransaction = () => ({
	data: "0x",
	from: SENDER,
	gasLimit: 21_000,
	gasPrice: 5,
	hash: "0xtx1",
	legacySecondSignature: undefined,
	nonce: 1n,
	r: "0xr",
	s: "0xs",
	senderPublicKey: SENDER_PUBLIC_KEY,
	to: "0xrecipient",
	transactionIndex: 0,
	v: 27,
	value: 0n,
});

const makeReceipt = () => ({
	contractAddress: undefined,
	cumulativeGasUsed: 21_000n,
	gasRefunded: 0n,
	gasUsed: 21_000n,
	logs: [],
	output: undefined,
	status: 1,
});

type Ctx = {
	app: Application;
	sync: Sync;
	addressFactory: any;
	configuration: any;
	roundCalculator: any;
	dataSource: any;
	databaseService: any;
	migrations: any;
	entityManager: any;
	repos: Record<string, any>;
	systemRepo: any;
	evm: any;
	state: any;
	validatorSet: any;
	proposerCalculator: any;
	logger: any;
	pluginConfiguration: any;
	queue: any;
	listeners: any;
	tokenParser: any;
	tokenWhitelist: any;
	queryResults: Record<string, any>;
	makeUnit: (overrides?: Partial<Record<string, any>>) => any;
};

describe<Ctx>("Sync", ({ it, beforeEach, assert, stub, spy, clock }) => {
	beforeEach((context) => {
		context.entityManager = {
			queries: [] as any[][],
			query: async (...args: any[]) => {
				context.entityManager.queries.push(args);
			},
		};

		context.repos = {
			block: makeRepo(),
			configuration: makeRepo(),
			legacyColdWallet: makeRepo(),
			multiPayment: makeRepo(),
			state: makeRepo(),
			token: makeRepo(),
			tokenAction: makeRepo(),
			tokenHolder: makeRepo(),
			transaction: makeRepo(),
			validatorRound: makeRepo(),
			wallet: makeRepo(),
		};
		context.repos.block.getLatestHeight = async () => 42;

		context.queryResults = {
			blocksCount: [{ count: "0" }],
			maxHeight: [{ count: "0", max_height: "0" }],
		};

		context.dataSource = {
			createQueryRunner: () => ({ query: async () => {} }),
			query: async (sql: string) =>
				sql.startsWith("select count(1)") ? context.queryResults.blocksCount : context.queryResults.maxHeight,
			synchronize: async () => {},
			transaction: async (_level: string, callback: any) => callback(context.entityManager),
		};

		context.databaseService = {
			getLastCommit: async () => ({ block: { number: 0 } }),
			isEmpty: async () => true,
		};

		context.migrations = { runMigrations: async () => {}, synchronizeEntities: async () => {} };
		context.systemRepo = { inMaintenance: async () => false };
		context.evm = { getAccountInfo: async () => ({ balance: 1000n, nonce: 3n }) };
		context.state = { isBootstrap: () => false };
		context.validatorSet = { getDirtyValidators: () => [], getRoundValidators: () => [] };
		context.proposerCalculator = { getValidatorIndex: (index: number) => index };
		context.addressFactory = { fromPublicKey: async () => SENDER };
		context.configuration = {
			getGenesisHeight: () => 0,
			getMilestone: () => ({ evmSpec: "shanghai" }),
			isNewMilestone: () => false,
		};
		context.roundCalculator = {
			calculateRound: (number: number) => ({ maxValidators: 2, round: number, roundHeight: number }),
			isNewRound: () => false,
		};
		context.logger = { debug: () => {}, debugExtra: () => {}, error: () => {}, info: () => {}, warn: () => {} };
		context.pluginConfiguration = {
			getOptional: (key: string, defaultValue: unknown) => defaultValue,
			getRequired: () => 1000,
		};
		context.queue = {
			drain: async () => {},
			jobs: [] as any[],
			push(job: any) {
				context.queue.jobs.push(job);
			},
			start: async () => {},
		};
		context.listeners = { bootstrap: async () => {} };
		context.tokenParser = { parseReceipt: async () => ({ tokenActions: [], tokenHolders: [], tokens: [] }) };
		context.tokenWhitelist = { bootstrap: async () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Application.Version).toConstantValue("0.0.1-test");
		context.app.bind(Identifiers.Cryptography.Identity.Address.Factory).toConstantValue(context.addressFactory);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(context.roundCalculator);
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		context.app.bind(ApiDatabaseIdentifiers.Migrations).toConstantValue(context.migrations);
		context.app.bind(ApiDatabaseIdentifiers.BlockRepositoryFactory).toConstantValue(() => context.repos.block);
		context.app
			.bind(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
			.toConstantValue(() => context.repos.configuration);
		context.app
			.bind(ApiDatabaseIdentifiers.MultiPaymentRepositoryFactory)
			.toConstantValue(() => context.repos.multiPayment);
		context.app.bind(ApiDatabaseIdentifiers.StateRepositoryFactory).toConstantValue(() => context.repos.state);
		context.app.bind(ApiDatabaseIdentifiers.SystemRepositoryFactory).toConstantValue(() => context.systemRepo);
		context.app
			.bind(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
			.toConstantValue(() => context.repos.transaction);
		context.app.bind(ApiDatabaseIdentifiers.TokenRepositoryFactory).toConstantValue(() => context.repos.token);
		context.app
			.bind(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
			.toConstantValue(() => context.repos.tokenHolder);
		context.app
			.bind(ApiDatabaseIdentifiers.TokenActionRepositoryFactory)
			.toConstantValue(() => context.repos.tokenAction);
		context.app
			.bind(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
			.toConstantValue(() => context.repos.validatorRound);
		context.app.bind(ApiDatabaseIdentifiers.WalletRepositoryFactory).toConstantValue(() => context.repos.wallet);
		context.app
			.bind(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory)
			.toConstantValue(() => context.repos.legacyColdWallet);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.EvmConsensus.Contracts.MultiPayment).toConstantValue("0xmultipayment");
		context.app.bind(Identifiers.State.State).toConstantValue(context.state);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue(context.logger);
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.pluginConfiguration)
			.whenTagged("plugin", "api-sync");
		context.app.bind(Identifiers.Services.Queue.Factory).toConstantValue(async () => context.queue);
		context.app.bind(Identifiers.ApiSync.Listener).toConstantValue(context.listeners);
		context.app.bind(Identifiers.ApiSync.TokenParser).toConstantValue(context.tokenParser);
		context.app.bind(Identifiers.ApiSync.TokenWhitelist).toConstantValue(context.tokenWhitelist);

		context.app.config("crypto.genesisBlock", { block: { number: 0, proposer: PROPOSER } });

		context.sync = context.app.resolve(Sync);

		context.makeUnit = (overrides = {}) => {
			const header = { ...makeHeader(), ...(overrides.header ?? {}) };
			const transactions = overrides.transactions ?? [makeTransaction()];
			const receipts =
				overrides.receipts ??
				new Map(transactions.map((transaction: any) => [transaction.hash, makeReceipt()]));

			return {
				blockNumber: header.number,
				getAccountUpdates: () => overrides.accountUpdates ?? [],
				getCommit: async () => ({
					block: { ...header, transactions },
					proof: { round: 0, signature: "0xproof", validators: [true, false] },
				}),
				getProcessorResult: () => ({ receipts }),
			};
		};
	});

	const runQueuedJob = async (context: Ctx) => {
		assert.equal(context.queue.jobs.length, 1);
		await context.queue.jobs[0].handle();
	};

	it("bootstrap: restores from scratch when the api database is empty", async (context) => {
		const { app, migrations, listeners, tokenWhitelist, queue, sync } = context;

		const restore = { restore: async () => {} };
		const restoreSpy = spy(restore, "restore");
		const appResolve = stub(app, "resolve").returnValue(restore);
		const synchronizeEntities = spy(migrations, "synchronizeEntities");
		const runMigrations = spy(migrations, "runMigrations");
		const listenersBootstrap = spy(listeners, "bootstrap");
		const whitelistBootstrap = spy(tokenWhitelist, "bootstrap");
		const queueStart = spy(queue, "start");

		await sync.bootstrap();

		synchronizeEntities.calledOnce();
		restoreSpy.calledOnce();
		runMigrations.neverCalled();
		listenersBootstrap.calledOnce();
		whitelistBootstrap.calledOnce();
		queueStart.calledOnce();

		appResolve.restore();
	});

	it("bootstrap: runs migrations instead of a restore when blocks are present and consistent", async (context) => {
		const { dataSource, databaseService, migrations, sync } = context;

		databaseService.isEmpty = async () => false;
		databaseService.getLastCommit = async () => ({ block: { number: 5 } });
		context.queryResults.blocksCount = [{ count: "5" }];
		context.queryResults.maxHeight = [{ count: "5", max_height: "5" }];

		const synchronize = spy(dataSource, "synchronize");
		const runMigrations = spy(migrations, "runMigrations");

		await sync.bootstrap();

		synchronize.neverCalled();
		runMigrations.calledOnce();
	});

	it("bootstrap: clears the database when storage and api database heights mismatch", async (context) => {
		const { dataSource, databaseService, logger, sync } = context;

		databaseService.isEmpty = async () => false;
		databaseService.getLastCommit = async () => ({ block: { number: 5 } });
		context.queryResults.blocksCount = [{ count: "3" }];
		context.queryResults.maxHeight = [{ count: "3", max_height: "3" }];

		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		const synchronize = spy(dataSource, "synchronize");
		const warn = spy(logger, "warn");

		await sync.bootstrap();

		warn.calledWith("Clearing API database for full restore.");
		synchronize.calledWith(true);

		appResolve.restore();
	});

	it("bootstrap: clears the database when a truncate is forced", async (context) => {
		const { dataSource, pluginConfiguration, sync } = context;

		pluginConfiguration.getOptional = (key: string, defaultValue: unknown) =>
			key === "truncateDatabase" ? true : defaultValue;

		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		const synchronize = spy(dataSource, "synchronize");

		await sync.bootstrap();

		synchronize.calledWith(true);

		appResolve.restore();
	});

	it("bootstrap: terminates the application when the database reset fails", async (context) => {
		const { app, dataSource, sync } = context;

		dataSource.synchronize = async () => {
			throw new Error("synchronize failed");
		};
		const restore = { restore: async () => {} };
		const appResolve = stub(app, "resolve").returnValue(restore);
		const terminate = stub(app, "terminate").resolvedValue(undefined);

		await sync.bootstrap();

		terminate.calledOnce();
		assert.equal(terminate.getCallArgs(0)[0], "failed to reset database");

		appResolve.restore();
		terminate.restore();
	});

	it("flush: drains the queue", async (context) => {
		const { queue, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		const drain = spy(queue, "drain");

		await sync.flush();

		drain.calledOnce();
	});

	it("getLastSyncedBlockHeight: returns the latest height from the block repository", async ({ sync }) => {
		assert.equal(await sync.getLastSyncedBlockHeight(), 42);
	});

	it("getLastSyncedBlockHeight: falls back to the genesis height", async (context) => {
		context.repos.block.getLatestHeight = async () => undefined;

		assert.equal(await context.sync.getLastSyncedBlockHeight(), 0);
	});

	it("onCommit: persists the block, transaction, state and wallets", async (context) => {
		const { repos, entityManager, logger, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		const debug = spy(logger, "debug");

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		// Block insert
		assert.equal(repos.block.qb.calls.values.length, 1);
		const block = repos.block.qb.calls.values[0][0];
		assert.equal(block.number, "1");
		assert.equal(block.hash, "0xblockhash");
		assert.equal(block.fee, "100");
		assert.equal(block.reward, "200");
		assert.equal(block.proposer, PROPOSER);
		assert.equal(block.signature, "0xproof");
		assert.equal(block.validatorRound, 1);

		// State supply update anchored on the previous block number
		assert.equal(repos.state.qb.calls.set[0][0].blockNumber, "1");
		assert.equal(repos.state.qb.calls.andWhere[0][1], { previousBlockNumber: "0" });

		// Transaction insert
		const [transactionBatch] = repos.transaction.qb.calls.values[0];
		assert.equal(transactionBatch.length, 1);
		assert.equal(transactionBatch[0].hash, "0xtx1");
		assert.equal(transactionBatch[0].blockHash, "0xblockhash");
		assert.equal(transactionBatch[0].senderPublicKey, SENDER_PUBLIC_KEY);
		assert.equal(transactionBatch[0].signature, "0xr0xs1b");
		assert.equal(transactionBatch[0].nonce, "1");
		assert.undefined(transactionBatch[0].decodedError);

		// The genesis proposer account is force-created on the first non-genesis block,
		// and the block proposer (not part of any account update) is manually inserted.
		assert.equal(repos.wallet.queries.length, 1);
		const [sql, parameters] = repos.wallet.queries[0];
		assert.true(sql.includes("INSERT INTO wallets"));
		// genesis proposer row + no separate proposer row (same address)
		assert.equal(parameters.length, 6);
		assert.equal(parameters[0], PROPOSER);
		assert.equal(parameters[2], "1000"); // balance from evm.getAccountInfo

		// Configuration version update without new milestones
		assert.equal(repos.configuration.qb.calls.set[0][0].version, "0.0.1-test");
		assert.undefined(repos.configuration.qb.calls.set[0][0].activeMilestones);

		// Validator ranks are refreshed at the end of the transaction
		assert.equal(entityManager.queries[0][0], "SELECT update_validator_ranks();");

		debug.calledOnce();
	});

	it("onCommit: does not log sync progress during bootstrap", async (context) => {
		const { logger, state, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		state.isBootstrap = () => true;
		const debug = spy(logger, "debug");

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		debug.neverCalled();
	});

	it("onCommit: maps account updates including votes, usernames and legacy merges", async (context) => {
		const { repos, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		const accountUpdates = [
			{ address: PROPOSER, balance: 50n, nonce: 1n, vote: "0xvalidator" },
			{ address: "0xunvoter", balance: 10n, nonce: 2n, unvote: "0xvalidator" },
			{ address: "0xnamed", balance: 20n, nonce: 3n, username: "alice" },
			{ address: "0xresigned", balance: 30n, nonce: 4n, usernameResigned: true },
			{
				address: "0xmerged",
				balance: 40n,
				legacyMergeInfo: { address: "LEGACY_ADDR", txHash: "0xmerge" },
				nonce: 5n,
			},
		];

		await sync.onCommit(context.makeUnit({ accountUpdates }));
		await runQueuedJob(context);

		const [, parameters] = repos.wallet.queries[0];
		const rows: any[][] = [];
		for (let index = 0; index < parameters.length; index += 6) {
			rows.push(parameters.slice(index, index + 6));
		}

		const byAddress = new Map(rows.map((row) => [row[0], row]));
		assert.equal(byAddress.get(PROPOSER)![4].vote, "0xvalidator");
		assert.equal(byAddress.get("0xunvoter")![4].unvote, "0xvalidator");
		assert.equal(byAddress.get("0xnamed")![4].username, "alice");
		assert.true(byAddress.get("0xresigned")![4].usernameResigned);
		assert.equal(byAddress.get("0xmerged")![4].legacyMerge, { address: "LEGACY_ADDR", txHash: "0xmerge" });

		// The proposer receives forged attributes because it produced the block.
		assert.equal(byAddress.get(PROPOSER)![4].validatorForgedTotal, "300");
		assert.equal(byAddress.get(PROPOSER)![4].validatorProducedBlocks, 1);

		// The merged legacy cold wallet is updated with the merge info.
		assert.equal(repos.legacyColdWallet.qb.calls.set[0][0], {
			mergeInfoTransactionHash: "0xmerge",
			mergeInfoWalletAddress: "0xmerged",
		});
		assert.equal(repos.legacyColdWallet.qb.calls.where[0][1], { legacyAddress: "LEGACY_ADDR" });
	});

	it("onCommit: inserts dirty validators that are not part of the account updates", async (context) => {
		const { repos, validatorSet, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		validatorSet.getDirtyValidators = () => [
			{
				address: "0xdirty",
				blsPublicKey: "0xbls",
				fee: 7n,
				isResigned: false,
				voteBalance: 999n,
				votersCount: 3,
			},
		];

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		const [, parameters] = repos.wallet.queries[0];
		const rows: any[][] = [];
		for (let index = 0; index < parameters.length; index += 6) {
			rows.push(parameters.slice(index, index + 6));
		}
		const dirtyRow = rows.find((row) => row[0] === "0xdirty");
		assert.defined(dirtyRow);
		// Sentinel balance/nonce so postgres keeps the existing values.
		assert.equal(dirtyRow![2], "-1");
		assert.equal(dirtyRow![3], "-1");
		assert.equal(dirtyRow![4].validatorPublicKey, "0xbls");
		assert.equal(dirtyRow![4].validatorVoteBalance, "999");
		assert.equal(dirtyRow![4].validatorVotersCount, 3);
		assert.equal(dirtyRow![4].validatorFee, "7");
		assert.false(dirtyRow![4].validatorResigned);
	});

	it("onCommit: stores the upcoming validator round on round boundaries", async (context) => {
		const { repos, roundCalculator, validatorSet, proposerCalculator, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		roundCalculator.isNewRound = (number: number) => number === 2;
		validatorSet.getRoundValidators = () => [
			{ address: "0xval-a", voteBalance: 10n },
			{ address: "0xval-b", voteBalance: 20n },
		];
		// Reverse the proposal order to prove the proposer calculator is honored.
		proposerCalculator.getValidatorIndex = (index: number) => 1 - index;

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		assert.equal(repos.validatorRound.qb.calls.values.length, 1);
		const round = repos.validatorRound.qb.calls.values[0][0];
		assert.equal(round.validators, ["0xval-b", "0xval-a"]);
		assert.equal(round.votes, ["20", "10"]);
	});

	it("onCommit: stores new milestones when the next block starts one", async (context) => {
		const { repos, configuration, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		configuration.isNewMilestone = (number: number) => number === 2;
		configuration.getMilestone = () => ({ evmSpec: "shanghai", height: 2 });

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		assert.equal(repos.configuration.qb.calls.set[0][0].activeMilestones, { evmSpec: "shanghai", height: 2 });
	});

	it("onCommit: upserts token entities and removes zeroed holders", async (context) => {
		const { repos, tokenParser, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		tokenParser.parseReceipt = async () => ({
			tokenActions: [
				{
					action: "Transfer",
					address: "0xtoken",
					blockNumber: "1",
					from: "0xa",
					index: 0,
					to: "0xb",
					transactionHash: "0xtx1",
					value: "5",
				},
			],
			tokenHolders: [
				{ address: "0xa", balance: "0", tokenAddress: "0xtoken" },
				{ address: "0xb", balance: "5", tokenAddress: "0xtoken" },
			],
			tokens: [{ address: "0xtoken", decimals: 18, name: "Token", symbol: "TKN", totalSupply: "100" }],
		});

		await sync.onCommit(context.makeUnit());
		await runQueuedJob(context);

		assert.equal(repos.token.qb.calls.values[0][0].length, 1);
		assert.equal(repos.tokenAction.qb.calls.values[0][0].length, 1);

		// Holder with balance 0 is deleted, the other upserted.
		assert.equal(repos.tokenHolder.removed[0], [{ address: "0xa", balance: "0", tokenAddress: "0xtoken" }]);
		assert.equal(repos.tokenHolder.qb.calls.values[0][0], [
			{ address: "0xb", balance: "5", tokenAddress: "0xtoken" },
		]);
	});

	it("onCommit: retries a failed sync until it succeeds", async (context) => {
		const { dataSource, entityManager, logger, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		const clk = clock();
		const warn = spy(logger, "warn");

		let failures = 1;
		const transaction = dataSource.transaction.bind(dataSource);
		dataSource.transaction = async (level: string, callback: any) => {
			if (failures > 0) {
				failures--;
				throw new Error("deadlock");
			}
			return transaction(level, callback);
		};

		await sync.onCommit(context.makeUnit());

		const pending = context.queue.jobs[0].handle();
		await clk.runAllAsync();
		await pending;

		warn.calledOnce();
		assert.true(warn.getCallArgs(0)[0].includes("deadlock"));
		// The retry ultimately succeeded and refreshed the validator ranks.
		assert.equal(entityManager.queries[0][0], "SELECT update_validator_ranks();");
	});

	it("onCommit: stops retrying once the configured attempts are exhausted", async (context) => {
		const { dataSource, entityManager, logger, pluginConfiguration, sync } = context;
		const restore = { restore: async () => {} };
		const appResolve = stub(context.app, "resolve").returnValue(restore);
		await sync.bootstrap();
		appResolve.restore();

		pluginConfiguration.getOptional = (key: string, defaultValue: unknown) =>
			key === "maxSyncAttempts" ? 1 : defaultValue;

		const clk = clock();
		const warn = spy(logger, "warn");

		dataSource.transaction = async () => {
			throw new Error("permanent failure");
		};

		await sync.onCommit(context.makeUnit());

		const pending = context.queue.jobs[0].handle();
		await clk.runAllAsync();
		await pending;

		warn.calledOnce();
		assert.equal(entityManager.queries.length, 0);
	});
});

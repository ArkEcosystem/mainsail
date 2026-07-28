import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { encodeAbiParameters, encodeEventTopics, parseAbi } from "viem";

import { Restore } from "./restore.js";

const GENESIS_PROPOSER = "0xgenesis";
const PROPOSER = "0xvalidator";
// Digit-only addresses survive viem checksumming unchanged.
const NAMED_USER = "0x1111111111111111111111111111111111111111";
const PAYMENT_RECIPIENT = "0x3333333333333333333333333333333333333333";
const USERNAME_CONTRACT = "0xusernames";
const MULTIPAYMENT_CONTRACT = "0xmultipayment";

const usernameAbi = parseAbi([
	"event UsernameRegistered(address addr, string username, string previousUsername)",
] as const);

const usernameRegisteredLog = (addr: string, username: string) => ({
	address: "0x0000000000000000000000000000000000000001",
	data: encodeAbiParameters(
		[
			{ name: "addr", type: "address" },
			{ name: "username", type: "string" },
			{ name: "previousUsername", type: "string" },
		],
		[addr, username, ""],
	),
	topics: encodeEventTopics({ abi: usernameAbi, eventName: "UsernameRegistered" }),
});

const paymentAbi = parseAbi(["event Payment(address indexed recipient, uint256 amount, bool success)"] as const);

const paymentLog = (recipient: string, amount: bigint) => ({
	address: "0x0000000000000000000000000000000000000001",
	data: encodeAbiParameters(
		[
			{ name: "amount", type: "uint256" },
			{ name: "success", type: "bool" },
		],
		[amount, true],
	),
	topics: encodeEventTopics({ abi: paymentAbi, args: { recipient }, eventName: "Payment" }),
});

// Chainable TypeORM query-builder fake that records every call.
const makeQb = () => {
	const calls: Record<string, any[][]> = {};
	const record = (method: string, args: any[]) => {
		(calls[method] ??= []).push(args);
	};

	const qb: any = { calls };
	for (const method of ["insert", "orIgnore", "orUpdate", "update", "set", "values", "where", "andWhere"]) {
		qb[method] = (...args: any[]) => {
			// Copy array arguments as the source reuses (and clears) its batch arrays.
			record(
				method,
				args.map((argument) => (Array.isArray(argument) ? [...argument] : argument)),
			);
			return qb;
		};
	}
	qb.execute = async () => {
		record("execute", []);
	};

	return qb;
};

const makeRepo = (tableName: string) => {
	const qb = makeQb();
	const repo: any = {
		createQueryBuilder: () => qb,
		metadata: { tableName },
		qb,
		queries: [] as any[][],
	};
	repo.query = async (...args: any[]) => {
		repo.queries.push(args);
	};
	return repo;
};

const makeBlock = (overrides: Record<string, any> = {}) => ({
	fee: 100n,
	gasUsed: 21_000,
	hash: "0xblock1",
	number: 1,
	parentHash: "0xblock0",
	payloadSize: 10,
	proposer: PROPOSER,
	reward: 200n,
	round: 0,
	stateRoot: "0xstateroot",
	timestamp: 1_720_000_000,
	transactions: [] as any[],
	transactionsCount: 0,
	transactionsRoot: "0xtxroot",
	version: 1,
	...overrides,
});

const makeTransaction = (hash: string, to: string) => ({
	data: "0x",
	from: "0xsender",
	gasLimit: 21_000,
	gasPrice: 5,
	hash,
	legacySecondSignature: undefined,
	nonce: 1n,
	r: "aa",
	s: "bb",
	senderPublicKey: "pk-sender",
	to,
	transactionIndex: 0,
	v: 27,
	value: 0n,
});

const makeReceipt = (blockNumber: number, txHash: string, logs: any[] = []) => ({
	blockNumber: BigInt(blockNumber),
	contractAddress: undefined,
	cumulativeGasUsed: 21_000n,
	gasRefunded: 0n,
	gasUsed: 21_000n,
	logs,
	output: undefined,
	status: 1,
	txHash,
});

type Ctx = {
	app: Application;
	restore: Restore;
	repos: Record<string, any>;
	systemRepo: any;
	entityManager: any;
	dataSource: any;
	databaseService: any;
	stateStore: any;
	migrations: any;
	evm: any;
	logger: any;
	consensusContractService: any;
	tokenParser: any;
	listeners: any;
	snapshotImporter: any;
	configuration: any;
	commits: any[];
	receipts: any[];
	accountPages: any[];
	legacyColdWalletPages: any[];
	validatorRounds: any[];
	milestone: Record<string, any>;
	batchSize: number;
};

describe<Ctx>("Restore", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.entityManager = {
			queries: [] as any[][],
			query: async (...args: any[]) => {
				context.entityManager.queries.push(args);
			},
		};

		context.repos = {
			block: makeRepo("blocks"),
			configuration: makeRepo("configuration"),
			contract: makeRepo("contracts"),
			legacyColdWallet: makeRepo("legacy_cold_wallets"),
			multiPayment: makeRepo("multi_payments"),
			state: makeRepo("state"),
			token: makeRepo("tokens"),
			tokenAction: makeRepo("token_actions"),
			tokenHolder: makeRepo("token_holders"),
			transaction: makeRepo("transactions"),
			validatorRound: makeRepo("validator_rounds"),
			wallet: makeRepo("wallets"),
		};

		context.systemRepo = {
			maintenance: [] as boolean[],
			setMaintenance: async (flag: boolean) => {
				context.systemRepo.maintenance.push(flag);
			},
		};

		context.dataSource = {
			transaction: async (levelOrCallback: any, callback?: any) =>
				typeof levelOrCallback === "function"
					? levelOrCallback(context.entityManager)
					: callback(context.entityManager),
		};

		const genesisBlock = makeBlock({
			hash: "0xblock0",
			number: 0,
			parentHash: "0x0",
			proposer: GENESIS_PROPOSER,
		});
		const block = makeBlock({
			transactions: [
				makeTransaction("0xtx1", USERNAME_CONTRACT),
				makeTransaction("0xtx2", MULTIPAYMENT_CONTRACT),
			],
			transactionsCount: 2,
		});

		context.commits = [
			{ block: genesisBlock, proof: { round: 0, signature: "0xsig0", validators: [true] } },
			{ block, proof: { round: 0, signature: "0xsig1", validators: [true] } },
		];

		context.receipts = [
			makeReceipt(1, "0xtx1", [usernameRegisteredLog(NAMED_USER, "alice")]),
			makeReceipt(1, "0xtx2", [paymentLog(PAYMENT_RECIPIENT, 25n)]),
		];

		context.databaseService = {
			getLastCommit: async () => context.commits.at(-1),
			isEmpty: async () => false,
			readCommits: async function* (from: number, to: number) {
				for (const commit of context.commits) {
					if (commit.block.number >= from && commit.block.number <= to) {
						yield commit;
					}
				}
			},
		};

		context.stateStore = { getGenesisCommit: () => context.commits[0] };
		context.migrations = { runMigrations: async () => {} };

		context.accountPages = [
			{
				accounts: [
					{ address: PROPOSER, balance: 1000n, legacyAttributes: {}, nonce: 1n },
					{ address: NAMED_USER, balance: 10n, legacyAttributes: {}, nonce: 2n },
				],
				nextOffset: 2n,
			},
			{
				accounts: [
					{
						address: "0xlegacyuser",
						balance: 20n,
						legacyAttributes: { legacyNonce: 3n, multiSignature: { min: 2 }, secondPublicKey: "0xspk" },
						nonce: 3n,
					},
					{ address: "0xmergetarget", balance: 30n, legacyAttributes: {}, nonce: 4n },
					{ address: "0xsnapvalidator", balance: 40n, legacyAttributes: {}, nonce: 5n },
					{ address: "0xlegacynonceonly", balance: 1n, legacyAttributes: { legacyNonce: 9n }, nonce: 6n },
					{
						address: "0xmultisigonly",
						balance: 2n,
						legacyAttributes: { multiSignature: { min: 1 } },
						nonce: 7n,
					},
				],
				nextOffset: undefined,
			},
		];

		context.legacyColdWalletPages = [
			{
				nextOffset: undefined,
				wallets: [
					{
						address: "LEGACY_MERGED",
						balance: 50n,
						legacyAttributes: { legacyNonce: 2n },
						mergeInfo: { address: "0xmergetarget", txHash: "0xmergetx" },
					},
					{ address: "LEGACY_UNMERGED", balance: 60n, legacyAttributes: {}, mergeInfo: undefined },
				],
			},
		];

		let accountCall = 0;
		let legacyCall = 0;
		context.evm = {
			getAccounts: async () => context.accountPages[accountCall++],
			getLegacyColdWallets: async () => context.legacyColdWalletPages[legacyCall++],
			getReceiptsByBlockRange: async () => ({ receipts: context.receipts }),
		};

		context.logger = { debug: () => {}, debugExtra: () => {}, error: () => {}, info: () => {}, warn: () => {} };

		context.validatorRounds = [
			{ round: 1, roundHeight: 1, validators: [{ address: PROPOSER, voteBalance: 100n }] },
		];

		context.consensusContractService = {
			getAllValidators: async () => [
				{
					address: PROPOSER,
					blsPublicKey: "0xbls",
					fee: 1n,
					isResigned: false,
					voteBalance: 100n,
					votersCount: 1,
				},
			],
			getValidatorRounds: async function* () {
				yield* context.validatorRounds;
			},
			getVotes: async function* () {
				yield { validatorAddress: PROPOSER, voterAddress: NAMED_USER };
			},
		};

		context.tokenParser = {
			parseReceipt: async () => ({
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
					{ address: "0xa", balance: "5", tokenAddress: "0xtoken" },
					{ address: "0xb", balance: "0", tokenAddress: "0xtoken" },
				],
				tokens: [{ address: "0xtoken", decimals: 18, name: "Token", symbol: "TKN", totalSupply: "100" }],
			}),
		};

		context.listeners = { flush: async () => {} };
		context.milestone = { evmSpec: "Latest", snapshot: true };

		context.snapshotImporter = {
			drain: () => [
				{
					ethAddress: "0xlegacyuser",
					legacyAttributes: { legacyNonce: 7n },
					publicKey: "pk-legacy",
				},
				{ ethAddress: undefined, legacyAttributes: {}, publicKey: undefined },
			],
			prepareRestore: async () => {},
			validators: [
				// Already named via the usernames contract -> snapshot username must be skipped.
				{ ethAddress: NAMED_USER, username: "snapshot-name" },
				{ ethAddress: "0xsnapvalidator", username: "snapval" },
			],
		};

		context.app = new Application();
		context.app.bind(Identifiers.Application.Version).toConstantValue("0.0.1-test");
		context.app
			.bind(Identifiers.Cryptography.Identity.Address.Factory)
			.toConstantValue({ fromPublicKey: async () => "0xsender" });
		context.configuration = {
			all: () => ({ network: "testnet" }),
			getGenesisHeight: () => 0,
			getMilestone: () => context.milestone,
		};
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);
		context.app.bind(ApiDatabaseIdentifiers.Migrations).toConstantValue(context.migrations);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue(context.logger);
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue({
			calculateRound: (number: number) => ({ maxValidators: 1, round: number, roundHeight: number }),
			isNewRound: () => true,
		});
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue({
			getValidatorIndexFrom: (_maxValidators: number, _totalRound: number, index: number) => index,
		});
		context.app.bind(ApiDatabaseIdentifiers.BlockRepositoryFactory).toConstantValue(() => context.repos.block);
		context.app
			.bind(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
			.toConstantValue(() => context.repos.configuration);
		context.app
			.bind(ApiDatabaseIdentifiers.ContractRepositoryFactory)
			.toConstantValue(() => context.repos.contract);
		context.app.bind(ApiDatabaseIdentifiers.StateRepositoryFactory).toConstantValue(() => context.repos.state);
		context.app.bind(ApiDatabaseIdentifiers.SystemRepositoryFactory).toConstantValue(() => context.systemRepo);
		context.app
			.bind(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
			.toConstantValue(() => context.repos.transaction);
		context.app
			.bind(ApiDatabaseIdentifiers.MultiPaymentRepositoryFactory)
			.toConstantValue(() => context.repos.multiPayment);
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
		context.app.bind(Identifiers.Evm.ContractService.Consensus).toConstantValue(context.consensusContractService);
		context.app.bind(Identifiers.EvmConsensus.Contracts.MultiPayment).toConstantValue(MULTIPAYMENT_CONTRACT);
		context.app.bind(Identifiers.EvmConsensus.Contracts.Usernames).toConstantValue(USERNAME_CONTRACT);
		context.app.bind(Identifiers.ApiSync.TokenParser).toConstantValue(context.tokenParser);
		context.app.bind(Identifiers.ApiSync.Listener).toConstantValue(context.listeners);
		context.app.bind(Identifiers.Snapshot.Legacy.Importer).toConstantValue(context.snapshotImporter);
		context.batchSize = 100;
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => context.batchSize })
			.whenTagged("plugin", "api-sync");

		context.restore = context.app.resolve(Restore);
	});

	it("restores blocks, transactions, wallets, rounds and state", async (context) => {
		const { repos, restore, snapshotImporter, systemRepo, entityManager, listeners, migrations } = context;

		const prepareRestore = spy(snapshotImporter, "prepareRestore");
		const flush = spy(listeners, "flush");
		const runMigrations = spy(migrations, "runMigrations");

		await restore.restore();

		prepareRestore.calledOnce();

		// Both blocks are inserted with their proof data.
		const blocks = repos.block.qb.calls.values[0][0];
		assert.equal(blocks.length, 2);
		assert.equal(blocks[0].number, "0");
		assert.equal(blocks[1].number, "1");
		assert.equal(blocks[1].signature, "0xsig1");
		assert.equal(blocks[1].fee, "100");
		assert.equal(blocks[1].reward, "200");

		// Both transactions land in the transactions table.
		const transactions = repos.transaction.qb.calls.values[0][0];
		assert.equal(
			transactions.map((transaction: any) => transaction.hash),
			["0xtx1", "0xtx2"],
		);
		// formatEcdsaSignature concatenates r || s || v (hex)
		assert.equal(transactions[0].signature, "aabb1b");

		// The multi payment on tx2 is recorded.
		const multiPayments = repos.multiPayment.qb.calls.values[0][0];
		assert.equal(multiPayments.length, 1);
		assert.equal(multiPayments[0].hash, "0xtx2");
		assert.equal(multiPayments[0].amount, "25");

		// Tokens/holders/actions from the parser; the zero-balance holder is skipped.
		assert.equal(repos.token.qb.calls.values[0][0].length, 1);
		assert.equal(repos.tokenAction.qb.calls.values[0][0].length, 2);
		const holders = repos.tokenHolder.qb.calls.values[0][0];
		assert.equal(holders, [{ address: "0xa", balance: "5", tokenAddress: "0xtoken" }]);

		// Wallets are ingested across both pages.
		const walletRows = repos.wallet.qb.calls.values.flatMap(([batch]: [any[]]) => batch);
		const byAddress = new Map(walletRows.map((row: any) => [row.address, row]));
		assert.equal(walletRows.length, 7);

		const validatorWallet = byAddress.get(PROPOSER)!;
		assert.equal(validatorWallet.attributes.validatorPublicKey, "0xbls");
		assert.equal(validatorWallet.attributes.validatorVoteBalance, "100");
		assert.equal(validatorWallet.attributes.validatorForgedFees, "100");
		assert.equal(validatorWallet.attributes.validatorForgedRewards, "200");
		assert.equal(validatorWallet.attributes.validatorForgedTotal, "300");
		assert.equal(validatorWallet.attributes.validatorProducedBlocks, 1);
		assert.equal(validatorWallet.attributes.validatorLastBlock.hash, "0xblock1");

		// The username registered on-chain wins over the snapshot username.
		const namedWallet = byAddress.get(NAMED_USER)!;
		assert.equal(namedWallet.attributes.username, "alice");
		assert.equal(namedWallet.attributes.vote, PROPOSER);

		// The snapshot-only username is applied.
		assert.equal(byAddress.get("0xsnapvalidator")!.attributes.username, "snapval");

		// Legacy wallet attributes from the snapshot and the EVM are merged.
		const legacyWallet = byAddress.get("0xlegacyuser")!;
		assert.true(legacyWallet.attributes.isLegacy);
		assert.equal(legacyWallet.attributes.legacyNonce, "3");
		assert.equal(legacyWallet.attributes.secondPublicKey, "0xspk");
		assert.equal(legacyWallet.attributes.multiSignature, { min: 2 });
		assert.equal(legacyWallet.publicKey, "pk-legacy");

		// The merged cold wallet target is flagged with the merge info.
		const mergeTarget = byAddress.get("0xmergetarget")!;
		assert.true(mergeTarget.attributes.isLegacy);
		assert.equal(mergeTarget.attributes.legacyMerge, { address: "LEGACY_MERGED", txHash: "0xmergetx" });

		// Legacy cold wallets are inserted.
		const coldWallets = repos.legacyColdWallet.qb.calls.values[0][0];
		assert.equal(coldWallets.length, 2);
		assert.equal(coldWallets[0].mergeInfoTransactionHash, "0xmergetx");
		assert.equal(coldWallets[0].attributes.legacyNonce, "2");

		// Validator rounds honor the proposer ordering.
		const rounds = repos.validatorRound.qb.calls.values[0][0];
		assert.equal(rounds, [{ round: 1, roundHeight: 1, validators: [PROPOSER], votes: ["100"] }]);

		// Configuration and state are written.
		assert.equal(repos.configuration.qb.calls.values[0][0].version, "0.0.1-test");
		assert.equal(repos.configuration.qb.calls.values[0][0].cryptoConfiguration, { network: "testnet" });
		// Partial legacy attributes only keep what is present.
		assert.equal(byAddress.get("0xlegacynonceonly")!.attributes, { legacyNonce: "9" });
		assert.equal(byAddress.get("0xmultisigonly")!.attributes, { multiSignature: { min: 1 } });

		const state = repos.state.qb.calls.values[0][0];
		assert.equal(state.blockNumber, "1");
		// account balances (1000+10+20+30+40+1+2) + unmerged legacy balance (60)
		assert.equal(state.supply, "1163");

		// Listener data is flushed inside the restore transaction and migrations run afterwards.
		flush.calledOnce();
		runMigrations.calledOnce();

		// Maintenance mode is toggled around the restore.
		assert.equal(systemRepo.maintenance, [true, false]);

		// Post-restore housekeeping: analyze + rank/token count refresh.
		const analyzed = Object.values(repos).filter((repo: any) =>
			repo.queries.some(([sql]: [string]) => sql.startsWith("ANALYZE")),
		);
		assert.equal(analyzed.length, 12);
		assert.equal(
			entityManager.queries.map(([sql]: [string]) => sql),
			[
				"SET LOCAL statement_timeout = 0;",
				"SELECT update_validator_ranks();",
				"SELECT update_wallet_token_counts();",
			],
		);
	});

	it("restores from the genesis commit when the consensus database is empty", async (context) => {
		const { repos, restore, databaseService, configuration } = context;

		databaseService.isEmpty = async () => true;
		context.commits = context.commits.slice(0, 1);
		context.receipts = [];
		configuration.all = () => undefined;

		await restore.restore();

		const blocks = repos.block.qb.calls.values[0][0];
		assert.equal(blocks.length, 1);
		assert.equal(blocks[0].number, "0");

		// Missing crypto configuration falls back to an empty object.
		assert.equal(repos.configuration.qb.calls.values[0][0].cryptoConfiguration, {});
	});

	it("ingests across multiple batches when the batch size is smaller than the chain", async (context) => {
		const { repos, restore } = context;

		context.batchSize = 1;

		await restore.restore();

		// One block insert per batch.
		assert.equal(
			repos.block.qb.calls.values.map(([batch]: [any[]]) => batch.map((block: any) => block.number)),
			[["0"], ["1"]],
		);

		// The chunk size follows the batch size, so every transaction is flushed individually ...
		assert.equal(
			repos.transaction.qb.calls.values.map(([batch]: [any[]]) => batch.map((t: any) => t.hash)),
			[["0xtx1"], ["0xtx2"]],
		);

		// ... and the token data is flushed as soon as it exceeds the chunk size.
		assert.equal(repos.token.qb.calls.values.length, 2);

		const multiPayments = repos.multiPayment.qb.calls.values.flatMap(([batch]: [any[]]) => batch);
		assert.equal(multiPayments.length, 1);
		assert.equal(multiPayments[0].hash, "0xtx2");
	});

	it("restores without a snapshot importer", async (context) => {
		const { repos, snapshotImporter } = context;

		// The importer is an optional dependency; simulate a network without a legacy snapshot.
		context.app.rebind(Identifiers.Snapshot.Legacy.Importer).toConstantValue(undefined);
		const restore = context.app.resolve(Restore);

		const prepareRestore = spy(snapshotImporter, "prepareRestore");

		await restore.restore();

		prepareRestore.neverCalled();

		const walletRows = repos.wallet.qb.calls.values.flatMap(([batch]: [any[]]) => batch);
		const byAddress = new Map(walletRows.map((row: any) => [row.address, row]));

		// No snapshot: no public key mapping, no isLegacy flag and no snapshot username.
		const legacyWallet = byAddress.get("0xlegacyuser")!;
		assert.null(legacyWallet.publicKey);
		assert.undefined(legacyWallet.attributes.isLegacy);
		assert.undefined(byAddress.get("0xsnapvalidator")!.attributes.username);

		// EVM-provided legacy attributes and on-chain usernames are unaffected.
		assert.equal(legacyWallet.attributes.legacyNonce, "3");
		assert.equal(byAddress.get(NAMED_USER)!.attributes.username, "alice");
	});

	it("skips the snapshot preparation when the milestone has no snapshot", async (context) => {
		const { restore, snapshotImporter } = context;

		context.milestone.snapshot = undefined;
		const prepareRestore = spy(snapshotImporter, "prepareRestore");

		await restore.restore();

		prepareRestore.neverCalled();
	});

	it("rejects when a non-genesis block was proposed by an unknown validator", async (context) => {
		const { restore } = context;

		context.commits[1].block.proposer = "0xunknown";

		await assert.rejects(() => restore.restore(), "unexpected validator");
	});

	it("rejects when the on-chain validator round size does not match the expected one", async (context) => {
		const { restore } = context;

		context.validatorRounds = [
			{
				round: 1,
				roundHeight: 1,
				validators: [
					{ address: PROPOSER, voteBalance: 100n },
					{ address: "0xother", voteBalance: 50n },
				],
			},
		];

		await assert.rejects(() => restore.restore(), /mismatch in expected/);
	});
});

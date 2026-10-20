import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as CryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { Application, Providers } from "@mainsail/kernel";
import { Contracts as TestRunnerContracts, describe } from "@mainsail/test-runner";
import { ServiceProvider as Validation } from "@mainsail/validation";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspect } from "node:util";
import { brotliDecompressSync } from "node:zlib";
import { DataSource } from "typeorm";

import { Identifiers as InternalIdentifiers } from "../identifiers";
import { LegacyChainTip, LegacySnapshot, LegacySnapshotManifest, LegacyWallet } from "../interfaces";
import { Generator } from "./generator";

const chainTip: LegacyChainTip = {
	hash: "9525c5e676b4e85ee67a4100bd660150e920f65427f16b096db610966ef5c225",
	number: "1000",
};

const nextChainTip: LegacyChainTip = {
	hash: "5c0f8e2d7a14b3f69e8d21c0a7b54f3e96d8c1a2b0e47f5d3c9a86e1f2b4d70c",
	number: "1001",
};

const publicKeyOf = async (app: Application, mnemonic: string): Promise<string> => {
	const { publicKey } = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(mnemonic);

	return publicKey;
};

const hotWallet = async (
	app: Application,
	mnemonic: string,
	fields: Partial<LegacyWallet> = {},
): Promise<LegacyWallet> => {
	const publicKey = await publicKeyOf(app, mnemonic);

	return {
		arkAddress: await app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
			.fromPublicKey(publicKey),
		attributes: {},
		balance: "100000000",
		legacyNonce: "1",
		publicKey,
		...fields,
	};
};

const coldWallet = async (
	app: Application,
	mnemonic: string,
	fields: Partial<LegacyWallet> = {},
): Promise<LegacyWallet> => ({
	...(await hotWallet(app, mnemonic)),
	legacyNonce: "0",
	publicKey: null,
	...fields,
});

type Attributes = Record<string, any>;

const walletRow = ({ arkAddress, attributes = {}, balance, legacyNonce, publicKey }: LegacyWallet) => {
	const { business, entities, htlc, ipfs, ...kept } = attributes as Attributes;

	if (kept.delegate) {
		const { lastBlock, ...delegate } = kept.delegate;
		kept.delegate = delegate;
	}

	return { arkAddress, attributes: kept, balance, lockedBalance: htlc?.lockedBalance ?? "0", legacyNonce, publicKey };
};

const columnOrder = ({
	arkAddress,
	publicKey,
	balance,
	legacyNonce,
	attributes,
	lockedBalance,
}: ReturnType<typeof walletRow>) => ({
	arkAddress,
	publicKey,
	balance,
	legacyNonce,
	attributes,
	lockedBalance,
});

const byAddress = (wallets: LegacyWallet[]): LegacyWallet[] =>
	[...wallets].sort((a, b) => (a.arkAddress < b.arkAddress ? -1 : 1));

interface V3State {
	chainTip: LegacyChainTip;
	wallets: LegacyWallet[];
}

type Row = ReturnType<typeof columnOrder>;

const statements: [string, string][] = [
	["CREATE EXTENSION IF NOT EXISTS dblink", "create extension"],
	["dblink_connect", "connect"],
	["dblink_cancel_query", "cancel"],
	["dblink_disconnect", "disconnect"],
	["dblink_open", "open"],
	["dblink_fetch", "fetch"],
	["dblink_close", "close"],
	[
		"SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND usesysid IS NOT NULL AND pid <> pg_backend_pid()",
		"sessions",
	],
	["BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", "begin"],
	["LOCK TABLE blocks, wallets IN ACCESS SHARE MODE", "lock"],
	["SELECT id, height FROM blocks ORDER BY height DESC LIMIT 1", "chain tip"],
	["count(*) FILTER (WHERE balance < 0)", "totals"],
	["COMMIT", "commit"],
];

class V3Database {
	public committed: V3State;
	public lost = false;
	public otherSessions = 0;
	public connection: unknown;
	public connectStatement = "";
	public connectError: Error | undefined;
	public cursorStatement = "";
	public readonly statements: string[] = [];
	public readonly fetchSizes: number[] = [];
	public onStatement: (statement: string) => void = () => {};
	public tamper: (rows: Row[]) => Row[] = (rows) => rows;

	#inTransaction = false;
	#snapshot: V3State | undefined;
	#cursor: Row[] | undefined;

	public constructor(state: V3State) {
		this.committed = state;
	}

	public query = async (sql: string, parameters: unknown[] = []): Promise<unknown[]> => {
		const text = [sql, ...parameters.filter((parameter) => typeof parameter === "string")]
			.join(" ")
			.replaceAll(/\s+/g, " ");
		const [, statement] = statements.find(([fragment]) => text.includes(fragment)) ?? [];
		if (!statement) {
			throw new Error(`Unexpected query: ${sql}`);
		}

		this.statements.push(statement);

		if (this.lost) {
			throw new Error("Connection terminated unexpectedly");
		}

		const result = this.#execute(statement, sql, parameters);
		this.onStatement(statement);
		return result;
	};

	#execute(statement: string, sql: string, parameters: unknown[]): unknown[] {
		switch (statement) {
			case "connect": {
				if (this.connectError) {
					throw this.connectError;
				}

				this.connectStatement = sql;
				this.connection = parameters[0];
				return [];
			}
			case "sessions": {
				return [{ sessions: String(this.otherSessions) }];
			}
			case "begin": {
				this.#inTransaction = true;
				return [];
			}
			case "commit":
			case "disconnect": {
				this.#inTransaction = false;
				this.#snapshot = undefined;
				this.#cursor = undefined;
				return [];
			}
			case "chain tip": {
				return [{ ...this.#state().chainTip }];
			}
			case "totals": {
				const { wallets } = this.#state();
				const sum = (values: (bigint | number | string)[]) =>
					values.reduce<bigint>((total, value) => total + BigInt(value), 0n).toString();

				return [
					{
						balances: sum(wallets.map(({ balance }) => balance)),
						forgedRewards: sum(
							wallets.map(({ attributes }) => (attributes as Attributes)?.delegate?.forgedRewards ?? 0),
						),
						lockedBalances: sum(
							wallets.map(({ attributes }) => (attributes as Attributes)?.htlc?.lockedBalance ?? 0),
						),
						negativeWallets: String(wallets.filter(({ balance }) => BigInt(balance) < 0n).length),
						producedBlocks: sum(
							wallets.map(({ attributes }) => (attributes as Attributes)?.delegate?.producedBlocks ?? 0),
						),
						wallets: String(wallets.length),
					},
				];
			}
			case "open": {
				this.cursorStatement = String(parameters[0]).replaceAll(/\s+/g, " ").trim();
				this.#cursor = byAddress(this.#state().wallets).map((wallet) =>
					columnOrder(walletRow(structuredClone(wallet))),
				);
				return [];
			}
			case "fetch": {
				const [count] = parameters as [number];
				this.fetchSizes.push(count);

				return this.tamper(this.#cursor!.splice(0, Math.min(count, 2)));
			}
			default: {
				return [];
			}
		}
	}

	#state(): V3State {
		if (this.#inTransaction) {
			this.#snapshot ??= structuredClone(this.committed);
		}

		return this.#snapshot ?? this.committed;
	}
}

const snapshotDirectory = join("distribution", "snapshot");

const writtenFiles = (): string[] => readdirSync(snapshotDirectory).sort();

const writtenSnapshots = (): LegacySnapshot[] =>
	writtenFiles()
		.filter((file) => file.endsWith(".compressed"))
		.map((file) => JSON.parse(brotliDecompressSync(readFileSync(join(snapshotDirectory, file))).toString()));

const writtenManifests = (): LegacySnapshotManifest[] =>
	writtenFiles()
		.filter((file) => file.endsWith(".manifest.json"))
		.map((file) => JSON.parse(readFileSync(join(snapshotDirectory, file)).toString()));

const beforeFetch = ["create extension", "connect", "sessions", "begin", "lock", "chain tip", "totals"];

const exportStatements = (fetches: number): string[] => [
	...beforeFetch,
	"open",
	...Array.from({ length: fetches }, () => "fetch"),
	"close",
];

describe<{
	app: Application;
	generator: Generator;
	v3: V3Database;
	v3Options: { database: string; host: string; password: string; port: number; user: string };
	databaseOptions: { [option: string]: unknown; logging: boolean };
	dataSources: DataSource[];
	queryRunner: { manager: { query: V3Database["query"] }; query: V3Database["query"]; release: () => Promise<void> };
	logged: string[];
	initialize: TestRunnerContracts.Stub;
	destroy: TestRunnerContracts.Stub;
	cwd: string;
	directory: string;
	delegate: LegacyWallet;
	secondDelegate: LegacyWallet;
	sender: LegacyWallet;
	recipient: LegacyWallet;
	emptied: LegacyWallet;
	genesis: LegacyWallet;
	senderAfterTransfer: LegacyWallet;
	recipientAfterTransfer: LegacyWallet;
	exported: (wallets: LegacyWallet[]) => Promise<LegacyWallet[]>;
}>("Generator", ({ it, assert, beforeEach, afterEach, spy, stub }) => {
	beforeEach(async (context) => {
		context.cwd = process.cwd();
		context.directory = mkdtempSync(join(tmpdir(), "snapshot-legacy-exporter-"));
		mkdirSync(join(context.directory, snapshotDirectory), { recursive: true });
		process.chdir(context.directory);

		context.app = new Application();
		context.app
			.bind(Identifiers.Cryptography.Configuration)
			.toConstantValue({ getNetwork: () => ({ pubKeyHash: 30 }) });

		await context.app.resolve<Validation>(Validation).register();
		await context.app.resolve<CryptoHashBcrypto>(CryptoHashBcrypto).register();
		await context.app.resolve<CryptoKeyPairEcdsa>(CryptoKeyPairEcdsa).register();
		await context.app.resolve<CryptoAddressBase58>(CryptoAddressBase58).register();
		await context.app.resolve<CryptoAddressKeccak256>(CryptoAddressKeccak256).register();

		const delegate = await hotWallet(context.app, "first delegate", {
			balance: "2500000000000",
			legacyNonce: "2",
		});
		context.delegate = {
			...delegate,
			attributes: {
				delegate: {
					forgedFees: "30000000",
					forgedRewards: "120000000000",
					producedBlocks: 600,
					rank: 1,
					round: 20,
					username: "first_delegate",
					voteBalance: "2500000000000",
				},
				vote: delegate.publicKey,
			},
		};
		context.secondDelegate = await hotWallet(context.app, "second delegate", {
			attributes: {
				delegate: {
					forgedFees: "20000000",
					forgedRewards: "79800000000",
					producedBlocks: 399,
					rank: 2,
					resigned: true,
					username: "second_delegate",
					voteBalance: "0",
				},
				secondPublicKey: await publicKeyOf(context.app, "second delegate second secret"),
			},
			balance: "1500000000000",
			legacyNonce: "5",
		});
		context.sender = await coldWallet(context.app, "sender", { balance: "1000000000" });
		context.recipient = await coldWallet(context.app, "recipient", { balance: "100000000" });
		context.emptied = await hotWallet(context.app, "emptied", { balance: "0", legacyNonce: "3" });
		context.genesis = await hotWallet(context.app, "genesis", { balance: "-3801300000000" });
		context.senderAfterTransfer = await hotWallet(context.app, "sender", { balance: "490000000" });
		context.recipientAfterTransfer = { ...context.recipient, balance: "600000000" };

		const addressFactory = context.app.get<Contracts.Crypto.AddressFactory>(
			Identifiers.Cryptography.Identity.Address.Factory,
		);
		context.exported = (wallets) =>
			Promise.all(
				wallets.map(async (wallet) => {
					const { lockedBalance, ...row } = columnOrder(walletRow(wallet));

					return wallet.publicKey
						? { ...row, ethAddress: await addressFactory.fromPublicKey(wallet.publicKey) }
						: row;
				}),
			);

		context.v3 = new V3Database({
			chainTip,
			wallets: [
				context.secondDelegate,
				context.delegate,
				context.sender,
				context.recipient,
				context.emptied,
				context.genesis,
			],
		});
		context.queryRunner = {
			manager: { query: context.v3.query },
			query: context.v3.query,
			release: async () => {},
		};

		context.dataSources = [];
		context.initialize = stub(DataSource.prototype, "initialize").callsFake(async function (this: DataSource) {
			context.dataSources.push(this);
			return this;
		});
		context.destroy = stub(DataSource.prototype, "destroy").resolvedValue(undefined);
		stub(DataSource.prototype, "createQueryRunner").returnValue(context.queryRunner);

		context.v3Options = {
			database: "ark_devnet",
			host: "localhost",
			password: "test_db",
			port: 5432,
			user: "test_db",
		};
		context.databaseOptions = {
			database: "test_db",
			host: "localhost",
			logging: true,
			password: "password",
			port: 5432,
			type: "postgres",
			username: "test_db",
			v3: context.v3Options,
		};
		const pluginConfiguration = {
			discover: async () => pluginConfiguration,
			getRequired: () => context.databaseOptions,
		};

		context.logged = [];
		context.app.bind(InternalIdentifiers.Application).toConstantValue(context.app);
		context.app
			.bind(Identifiers.Services.Log.Service)
			.toConstantValue({ info: (message: string) => context.logged.push(message) });
		context.app.bind(Providers.PluginConfiguration).toConstantValue(pluginConfiguration);

		context.generator = context.app.resolve(Generator);
	});

	afterEach(({ cwd, directory }) => {
		process.chdir(cwd);
		rmSync(directory, { force: true, recursive: true });
	});

	it("should export every wallet in address order", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		emptied,
		genesis,
		exported,
	}) => {
		const wallets = await exported(byAddress([delegate, secondDelegate, sender, recipient, emptied, genesis]));
		const hash = createHash("sha256");
		for (const value of [chainTip, ...wallets]) {
			hash.update(JSON.stringify(value));
		}
		const snapshotHash = hash.digest("hex");

		await generator.generate(1000, chainTip.hash);

		assert.equal(writtenSnapshots(), [{ chainTip, hash: snapshotHash, wallets }]);
		assert.equal(writtenFiles(), [`${snapshotHash}.compressed`, `${snapshotHash}.manifest.json`]);
		assert.equal(v3.statements, [...exportStatements(4), "commit", "chain tip", "disconnect"]);
		assert.equal(v3.fetchSizes, [10_000, 10_000, 10_000, 10_000]);
		assert.true(v3.cursorStatement.endsWith('FROM wallets ORDER BY address COLLATE "C"'));
	});

	it("should leave the attributes Mainsail does not import to V3 to drop", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
		exported,
	}) => {
		v3.committed = {
			chainTip,
			wallets: [
				{
					...secondDelegate,
					attributes: {
						...secondDelegate.attributes,
						business: {
							businessAsset: { name: "Second Delegate", website: "https://second-delegate.example" },
						},
						entities: {
							"1a65e0ae85b54bc76993765525f9fa186e26d14f67c0eee5181c22017006df26": {
								data: { name: "second_delegate_plugin" },
								subType: 0,
								type: 2,
							},
						},
						ipfs: { hashes: { QmaWdnGqVMK6jJJu8dhSb255bXhfz54hEQtWjx98HLWaz1: true } },
					},
				},
				{
					...delegate,
					attributes: {
						...delegate.attributes,
						delegate: {
							...(delegate.attributes?.delegate as object),
							lastBlock: { generatorPublicKey: delegate.publicKey, height: 1000, id: chainTip.hash },
						},
					},
				},
				sender,
				recipient,
				genesis,
			],
		};

		await generator.generate(1000, chainTip.hash);

		assert.true(
			v3.cursorStatement.includes(
				"(attributes - 'business' - 'entities' - 'htlc' - 'ipfs') #- '{delegate,lastBlock}'",
			),
		);
		assert.true(v3.cursorStatement.includes("coalesce((attributes->'htlc'->>'lockedBalance')::numeric, 0)"));
		assert.equal(
			writtenSnapshots()[0].wallets,
			await exported(byAddress([delegate, secondDelegate, sender, recipient, genesis])),
		);
	});

	it("should read the totals and every wallet from the snapshot the chain tip was read in", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		emptied,
		genesis,
		senderAfterTransfer,
		recipientAfterTransfer,
		exported,
	}) => {
		v3.onStatement = (statement) => {
			if (statement === "chain tip" && v3.committed.wallets.includes(sender)) {
				v3.committed = {
					chainTip,
					wallets: [secondDelegate, delegate, senderAfterTransfer, recipientAfterTransfer, emptied, genesis],
				};
			}
		};

		await generator.generate(1000, chainTip.hash);

		assert.equal(v3.committed.wallets, [
			secondDelegate,
			delegate,
			senderAfterTransfer,
			recipientAfterTransfer,
			emptied,
			genesis,
		]);
		assert.equal(
			writtenSnapshots()[0].wallets,
			await exported(byAddress([delegate, secondDelegate, sender, recipient, emptied, genesis])),
		);
	});

	it("should abort without writing while another session uses the V3 database", async ({ generator, v3 }) => {
		v3.otherSessions = 1;

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				"V3 database has 1 other session(s), stop V3 (core, relay, forger, API) and close other clients (e.g. psql) before the export",
			),
		);

		assert.equal(v3.statements, ["create extension", "connect", "sessions", "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 is not at the expected height", async ({ generator, v3 }) => {
		await assert.rejects(
			() => generator.generate(1001, chainTip.hash),
			new Error("V3 chain tip is at height 1000, expected 1001"),
		);

		assert.equal(v3.statements, [...beforeFetch.slice(0, -1), "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 has another block at the expected height", async ({ generator, v3 }) => {
		await assert.rejects(
			() => generator.generate(1000, nextChainTip.hash),
			new Error(`V3 block 1000 is ${chainTip.hash}, expected ${nextChainTip.hash}`),
		);

		assert.equal(v3.statements, [...beforeFetch.slice(0, -1), "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 produces a block during the export", async ({ generator, v3 }) => {
		v3.onStatement = (statement) => {
			if (statement === "open") {
				v3.committed = { ...v3.committed, chainTip: nextChainTip };
			}
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				`V3 chain tip moved from 1000 (${chainTip.hash}) to 1001 (${nextChainTip.hash}) during the export`,
			),
		);

		assert.equal(v3.committed.chainTip, nextChainTip);
		assert.equal(v3.statements, [...exportStatements(4), "commit", "chain tip", "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 replaces the block at the chain tip during the export", async ({
		generator,
		v3,
	}) => {
		const replacedChainTip: LegacyChainTip = { hash: nextChainTip.hash, number: chainTip.number };
		v3.onStatement = (statement) => {
			if (statement === "open") {
				v3.committed = { ...v3.committed, chainTip: replacedChainTip };
			}
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				`V3 chain tip moved from 1000 (${chainTip.hash}) to 1000 (${nextChainTip.hash}) during the export`,
			),
		);

		assert.equal(v3.committed.chainTip, replacedChainTip);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 has no wallets", async ({ generator, v3 }) => {
		v3.committed = { chainTip, wallets: [] };

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("V3 has no wallets at height 1000"),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without fetching when the V3 wallets table lags the chain tip", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		const laggingDelegate: LegacyWallet = {
			...secondDelegate,
			attributes: {
				...secondDelegate.attributes,
				delegate: { ...(secondDelegate.attributes?.delegate as object), producedBlocks: 398 },
			},
		};
		v3.committed = { chainTip, wallets: [laggingDelegate, delegate, sender, recipient, genesis] };

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("V3 wallets account for 998 produced blocks, expected 999 at height 1000"),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without fetching when the V3 wallets account for more blocks than the chain tip", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		const leadingDelegate: LegacyWallet = {
			...secondDelegate,
			attributes: {
				...secondDelegate.attributes,
				delegate: { ...(secondDelegate.attributes?.delegate as object), producedBlocks: 400 },
			},
		};
		v3.committed = { chainTip, wallets: [leadingDelegate, delegate, sender, recipient, genesis] };

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("V3 wallets account for 1000 produced blocks, expected 999 at height 1000"),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without fetching when the balances add up to more than the forged rewards", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		v3.committed = {
			chainTip,
			wallets: [secondDelegate, delegate, sender, { ...recipient, balance: "100000001" }, genesis],
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				"V3 balances and HTLC locks add up to 199800000001, expected the forged rewards 199800000000 at height 1000",
			),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without fetching when the balances add up to less than the forged rewards", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		v3.committed = {
			chainTip,
			wallets: [secondDelegate, delegate, sender, { ...recipient, balance: "99999999" }, genesis],
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				"V3 balances and HTLC locks add up to 199799999999, expected the forged rewards 199800000000 at height 1000",
			),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should count HTLC locks into the supply and leave them out of the export", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		const lockingDelegate: LegacyWallet = {
			...secondDelegate,
			attributes: {
				...secondDelegate.attributes,
				htlc: {
					lockedBalance: "5000000",
					locks: {
						d4f33d788a8c8392b70d346c947df83f07bf31ea2f67f04f124de68e50c07dd7: {
							amount: "5000000",
							expiration: { type: 2, value: 1100 },
							recipientId: recipient.arkAddress,
							secretHash: "3a8cafac738cc24997d5eaaa13b3cffd06585cbb19da658860e11f5708cbb518",
						},
					},
				},
			},
			balance: "1499995000000",
		};
		v3.committed = { chainTip, wallets: [lockingDelegate, delegate, sender, recipient, genesis] };

		await generator.generate(1000, chainTip.hash);

		const [exported] = writtenSnapshots()[0].wallets.filter(
			({ arkAddress }) => arkAddress === secondDelegate.arkAddress,
		);
		assert.equal(exported.balance, "1499995000000");
		assert.false("htlc" in (exported.attributes ?? {}));
		assert.equal(writtenManifests()[0].droppedHtlcLocks, "5000000");
	});

	it("should abort without fetching when another wallet than the genesis wallet is negative", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
		genesis,
	}) => {
		v3.committed = {
			chainTip,
			wallets: [
				secondDelegate,
				delegate,
				sender,
				{ ...recipient, balance: "-100000000" },
				{ ...genesis, balance: "-3801100000000" },
			],
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("V3 has 2 wallets with a negative balance, expected only the genesis wallet"),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without fetching when no wallet is negative", async ({
		generator,
		v3,
		delegate,
		secondDelegate,
		sender,
		recipient,
	}) => {
		v3.committed = { chainTip, wallets: [secondDelegate, delegate, sender, recipient] };

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("V3 has 0 wallets with a negative balance, expected only the genesis wallet"),
		);

		assert.equal(v3.statements, [...beforeFetch, "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when V3 returns a wallet twice", async ({ generator, v3, emptied }) => {
		v3.committed = { ...v3.committed, wallets: [...v3.committed.wallets, { ...emptied }] };

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(`V3 returned wallet ${emptied.arkAddress} twice or out of order`),
		);

		assert.equal(v3.statements.slice(0, beforeFetch.length + 1), [...beforeFetch, "open"]);
		assert.equal(v3.statements.slice(-2), ["cancel", "disconnect"]);
		assert.false(v3.statements.includes("commit"));
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when a wallet goes missing between V3 and the export", async ({
		generator,
		v3,
		recipient,
	}) => {
		v3.tamper = (rows) => rows.filter(({ arkAddress }) => arkAddress !== recipient.arkAddress);

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error(
				"The fetched V3 wallets do not add up to V3's totals: balances 199700000000, expected 199800000000; wallets 5, expected 6",
			),
		);

		assert.equal(v3.statements, [...exportStatements(4), "cancel", "disconnect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should abort without writing when a wallet changes between V3 and the export", async ({
		generator,
		v3,
		delegate,
	}) => {
		v3.tamper = (rows) =>
			rows.map((row) =>
				row.arkAddress === delegate.arkAddress
					? {
							...row,
							attributes: {
								...row.attributes,
								delegate: { ...row.attributes.delegate, producedBlocks: 601 },
							},
						}
					: row,
			);

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("The fetched V3 wallets do not add up to V3's totals: producedBlocks 1000, expected 999"),
		);

		assert.equal(writtenFiles(), []);
	});

	it("should cancel and close the V3 connection when a fetch fails", async ({
		generator,
		v3,
		queryRunner,
		destroy,
	}) => {
		const release = spy(queryRunner, "release");
		v3.onStatement = (statement) => {
			if (statement === "fetch" && v3.fetchSizes.length === 2) {
				throw new Error("canceling statement due to statement timeout");
			}
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("canceling statement due to statement timeout"),
		);

		assert.equal(v3.statements, [...beforeFetch, "open", "fetch", "fetch", "cancel", "disconnect"]);
		release.calledOnce();
		destroy.calledOnce();
		assert.equal(writtenFiles(), []);
	});

	it("should keep the fetch error when the local session is lost", async ({
		generator,
		v3,
		queryRunner,
		destroy,
	}) => {
		const release = spy(queryRunner, "release");
		v3.onStatement = (statement) => {
			if (statement === "fetch" && v3.fetchSizes.length === 2) {
				v3.lost = true;
				throw new Error("terminating connection due to administrator command");
			}
		};

		await assert.rejects(
			() => generator.generate(1000, chainTip.hash),
			new Error("terminating connection due to administrator command"),
		);

		assert.equal(v3.statements, [...beforeFetch, "open", "fetch", "fetch", "cancel", "disconnect"]);
		release.calledOnce();
		destroy.calledOnce();
		assert.equal(writtenFiles(), []);
	});

	it("should write a manifest of the snapshot next to it", async ({ generator, logged, genesis }) => {
		await generator.generate(1000, chainTip.hash);

		const [{ hash }] = writtenSnapshots();
		const manifest: LegacySnapshotManifest = {
			chainTip,
			delegates: 2,
			droppedHtlcLocks: "0",
			forgedRewards: "199800000000",
			hash,
			negativeWallets: [{ address: genesis.arkAddress, balance: "-3801300000000" }],
			positiveBalances: "4001100000000",
			producedBlocks: "999",
			resignedDelegates: 1,
			totalBalances: "199800000000",
			voters: 1,
			wallets: 6,
			walletsWithPublicKey: 4,
		};

		assert.equal(writtenManifests(), [manifest]);
		assert.true(
			logged.includes(
				`Wrote the manifest to 'distribution/snapshot/${hash}.manifest.json': ${JSON.stringify(manifest)}`,
			),
		);
	});

	it("should pass the V3 connection string as a quoted parameter", async ({ generator, v3, v3Options }) => {
		v3Options.password = "it's a \\ secret";

		await generator.generate(1000, chainTip.hash);

		assert.equal(v3.connectStatement, "SELECT dblink_connect('v3_db', $1);");
		assert.equal(
			v3.connection,
			"dbname='ark_devnet' host='localhost' password='it\\'s a \\\\ secret' port='5432' user='test_db'",
		);
	});

	it("should not log the queries, as the V3 connection parameter carries the password", async ({
		generator,
		databaseOptions,
		dataSources,
	}) => {
		assert.true(databaseOptions.logging);

		await generator.generate(1000, chainTip.hash);

		assert.equal(
			dataSources.map(({ options }) => options.logging),
			[false],
		);
	});

	it("should keep the V3 password out of a connection error", async ({ generator, v3, v3Options }) => {
		v3Options.password = "secret password";
		v3.connectError = Object.assign(new Error("could not establish connection"), {
			detail: 'password authentication failed for user "test_db"',
			parameters: ["dbname='ark_devnet' password='secret password'"],
		});

		const error: Error = await generator.generate(1000, chainTip.hash).catch((error) => error);

		assert.equal(error.message, 'Could not connect to V3: password authentication failed for user "test_db"');
		assert.false(inspect(error).includes("secret password"));
		assert.equal(v3.statements, ["create extension", "connect"]);
		assert.equal(writtenFiles(), []);
	});

	it("should reject an expected height that is not a positive integer", async ({ generator, initialize }) => {
		await assert.rejects(() => generator.generate(0, chainTip.hash), "Expected the V3 height to export, got 0");
		await assert.rejects(
			() => generator.generate(Number.NaN, chainTip.hash),
			"Expected the V3 height to export, got NaN",
		);

		initialize.neverCalled();
	});

	it("should reject an expected block id that is not a block id", async ({ generator, initialize }) => {
		await assert.rejects(() => generator.generate(1000, "1000"), "Expected the V3 block id to export, got 1000");
		await assert.rejects(
			() => generator.generate(1000, chainTip.hash.toUpperCase()),
			`Expected the V3 block id to export, got ${chainTip.hash.toUpperCase()}`,
		);

		initialize.neverCalled();
	});
});

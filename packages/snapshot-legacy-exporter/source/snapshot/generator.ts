import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Application, Providers } from "@mainsail/kernel";
import { assert } from "@mainsail/utils";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliCompress, constants } from "node:zlib";
import { DataSource, EntityManager } from "typeorm";
import { PostgresDataSourceOptions } from "typeorm/driver/postgres/PostgresDataSourceOptions.js";

import { Identifiers as InternalIdentifiers } from "../identifiers.js";
import { LegacyChainTip, LegacySnapshot, LegacyWallet } from "../interfaces.js";

interface DatabaseOptions extends PostgresDataSourceOptions {
	readonly v3: {
		readonly host: string;
		readonly port: number;
		readonly user: string;
		readonly password: string;
		readonly database: string;
	};
}

interface Totals {
	wallets: bigint;
	balances: bigint;
	negativeWallets: bigint;
	lockedBalances: bigint;
	forgedRewards: bigint;
	producedBlocks: bigint;
}

interface WalletRow extends LegacyWallet {
	readonly lockedBalance: string;
}

const TOTALS_QUERY = `
	SELECT
		count(*),
		coalesce(sum(balance), 0),
		count(*) FILTER (WHERE balance < 0),
		coalesce(sum((attributes->'htlc'->>'lockedBalance')::numeric), 0),
		coalesce(sum((attributes->'delegate'->>'forgedRewards')::numeric), 0),
		coalesce(sum((attributes->'delegate'->>'producedBlocks')::numeric), 0)
	FROM wallets
`;

const TOTALS_COLUMNS = `
	wallets numeric,
	balances numeric,
	"negativeWallets" numeric,
	"lockedBalances" numeric,
	"forgedRewards" numeric,
	"producedBlocks" numeric
`;

// Byte order (COLLATE "C") keeps the snapshot hash independent of the V3 server's collation
const WALLETS_CURSOR = `
	SELECT
		address,
		public_key,
		balance,
		nonce,
		(attributes - 'business' - 'entities' - 'htlc' - 'ipfs') #- '{delegate,lastBlock}',
		coalesce((attributes->'htlc'->>'lockedBalance')::numeric, 0)
	FROM wallets
	ORDER BY address COLLATE "C"
`;

const WALLETS_COLUMNS = `
	"arkAddress" varchar,
	"publicKey" varchar,
	balance bigint,
	"legacyNonce" bigint,
	attributes jsonb,
	"lockedBalance" numeric
`;

const FETCH_SIZE = 10_000;

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	private app!: Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async generateStatic(chainTip: LegacyChainTip, wallets: LegacyWallet[]): Promise<void> {
		const addressFactory = this.app.get<Contracts.Crypto.AddressFactory>(
			Identifiers.Cryptography.Identity.Address.Factory,
		);

		await this.#writeSnapshot(
			chainTip,
			await Promise.all(
				wallets.map(async (wallet) => ({
					...wallet,

					...(wallet.publicKey
						? {
								ethAddress: await addressFactory.fromPublicKey(wallet.publicKey),
							}
						: {}),
				})),
			),
		);
	}

	public async generate(expectedHeight: number, expectedHash: string): Promise<void> {
		if (!Number.isSafeInteger(expectedHeight) || expectedHeight < 1) {
			throw new Error(`Expected the V3 height to export, got ${expectedHeight}`);
		}

		if (!/^[\da-f]{64}$/.test(expectedHash)) {
			throw new Error(`Expected the V3 block id to export, got ${expectedHash}`);
		}

		await this.#runWithV3Connection(async (entityManager) => {
			this.logger.info("connected!");

			await this.#assertV3Stopped(entityManager);

			await this.#executeOnV3(entityManager, "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
			await this.#executeOnV3(entityManager, "LOCK TABLE blocks, wallets IN ACCESS SHARE MODE");

			const chainTip = await this.#getChainTip(entityManager);
			this.#assertChainTip(chainTip, expectedHeight, expectedHash);

			const totals = await this.#getTotals(entityManager);
			this.#assertTotals(chainTip, totals);

			const wallets = await this.#fetchWallets(entityManager, totals);

			await this.#executeOnV3(entityManager, "COMMIT");

			const currentChainTip = await this.#getChainTip(entityManager);

			if (currentChainTip?.hash !== chainTip.hash || currentChainTip.number !== chainTip.number) {
				throw new Error(
					`V3 chain tip moved from ${chainTip.number} (${chainTip.hash}) to ${currentChainTip?.number} (${currentChainTip?.hash}) during the export`,
				);
			}

			await this.#writeSnapshot(chainTip, wallets);
		});
	}

	async #assertV3Stopped(entityManager: EntityManager): Promise<void> {
		const [{ sessions }] = await this.#queryV3<{ sessions: string }>(
			entityManager,
			"SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND usesysid IS NOT NULL AND pid <> pg_backend_pid()",
			"sessions bigint",
		);

		if (Number(sessions) !== 0) {
			throw new Error(
				`V3 database has ${sessions} other session(s), stop V3 (core, relay, forger, API) and close other clients (e.g. psql) before the export`,
			);
		}
	}

	#assertChainTip(
		chainTip: LegacyChainTip | undefined,
		expectedHeight: number,
		expectedHash: string,
	): asserts chainTip is LegacyChainTip {
		if (chainTip?.number !== expectedHeight.toString()) {
			throw new Error(`V3 chain tip is at height ${chainTip?.number}, expected ${expectedHeight}`);
		}

		if (chainTip.hash !== expectedHash) {
			throw new Error(`V3 block ${chainTip.number} is ${chainTip.hash}, expected ${expectedHash}`);
		}
	}

	async #getTotals(entityManager: EntityManager): Promise<Totals> {
		const [row] = await this.#queryV3<Record<keyof Totals, string>>(entityManager, TOTALS_QUERY, TOTALS_COLUMNS);

		return {
			balances: BigInt(row.balances),
			forgedRewards: BigInt(row.forgedRewards),
			lockedBalances: BigInt(row.lockedBalances),
			negativeWallets: BigInt(row.negativeWallets),
			producedBlocks: BigInt(row.producedBlocks),
			wallets: BigInt(row.wallets),
		};
	}

	#assertTotals(chainTip: LegacyChainTip, totals: Totals): void {
		if (totals.wallets === 0n) {
			throw new Error(`V3 has no wallets at height ${chainTip.number}`);
		}

		const expectedBlocks = BigInt(chainTip.number) - 1n;
		if (totals.producedBlocks !== expectedBlocks) {
			throw new Error(
				`V3 wallets account for ${totals.producedBlocks} produced blocks, expected ${expectedBlocks} at height ${chainTip.number}`,
			);
		}

		if (totals.negativeWallets !== 1n) {
			throw new Error(
				`V3 has ${totals.negativeWallets} wallets with a negative balance, expected only the genesis wallet`,
			);
		}

		const supply = totals.balances + totals.lockedBalances;
		if (supply !== totals.forgedRewards) {
			throw new Error(
				`V3 balances and HTLC locks add up to ${supply}, expected the forged rewards ${totals.forgedRewards} at height ${chainTip.number}`,
			);
		}
	}

	async #fetchWallets(entityManager: EntityManager, totals: Totals): Promise<LegacyWallet[]> {
		const addressFactory = this.app.get<Contracts.Crypto.AddressFactory>(
			Identifiers.Cryptography.Identity.Address.Factory,
		);

		await entityManager.query("SELECT dblink_open('v3_db', 'v3_wallets', $1::text);", [WALLETS_CURSOR]);

		const wallets: LegacyWallet[] = [];
		const fetched: Totals = {
			balances: 0n,
			forgedRewards: 0n,
			lockedBalances: 0n,
			negativeWallets: 0n,
			producedBlocks: 0n,
			wallets: 0n,
		};
		let lastAddress = "";

		for (;;) {
			const rows: WalletRow[] = await entityManager.query(
				`SELECT * FROM dblink_fetch('v3_db', 'v3_wallets', $1::integer) AS wallets(${WALLETS_COLUMNS});`,
				[FETCH_SIZE],
			);

			if (rows.length === 0) {
				break;
			}

			for (const { lockedBalance, ...wallet } of rows) {
				this.#assertAfter(lastAddress, wallet);
				lastAddress = wallet.arkAddress;

				this.#addToTotals(fetched, wallet, lockedBalance);

				wallets.push({
					...wallet,
					...(wallet.publicKey
						? {
								ethAddress: await addressFactory.fromPublicKey(wallet.publicKey),
							}
						: {}),
				});
			}

			this.logger.info(`Fetched ${wallets.length} of ${totals.wallets} wallets`);
		}

		await entityManager.query("SELECT dblink_close('v3_db', 'v3_wallets');");

		this.#assertFetched(fetched, totals);

		return wallets;
	}

	#assertAfter(lastAddress: string, { arkAddress }: LegacyWallet): void {
		if (arkAddress <= lastAddress) {
			throw new Error(`V3 returned wallet ${arkAddress} twice or out of order`);
		}
	}

	#addToTotals(totals: Totals, { attributes, balance }: LegacyWallet, lockedBalance: string): void {
		const delegate = attributes?.["delegate"] as { forgedRewards: string; producedBlocks: number } | undefined;

		totals.wallets += 1n;
		totals.balances += BigInt(balance);
		totals.negativeWallets += BigInt(balance) < 0n ? 1n : 0n;
		totals.lockedBalances += BigInt(lockedBalance);

		if (delegate) {
			totals.forgedRewards += BigInt(delegate.forgedRewards);
			totals.producedBlocks += BigInt(delegate.producedBlocks);
		}
	}

	#assertFetched(fetched: Totals, totals: Totals): void {
		const mismatches = (Object.keys(totals) as (keyof Totals)[]).filter((key) => fetched[key] !== totals[key]);

		if (mismatches.length > 0) {
			const details = mismatches.map((key) => `${key} ${fetched[key]}, expected ${totals[key]}`).join("; ");
			throw new Error(`The fetched V3 wallets do not add up to V3's totals: ${details}`);
		}
	}

	async #getChainTip(entityManager: EntityManager): Promise<LegacyChainTip | undefined> {
		const [chainTip] = await this.#queryV3<LegacyChainTip>(
			entityManager,
			"SELECT id, height FROM blocks ORDER BY height DESC LIMIT 1",
			"hash varchar, number bigint",
		);

		return chainTip;
	}

	async #queryV3<T>(entityManager: EntityManager, sql: string, columns: string): Promise<T[]> {
		return entityManager.query(`SELECT * FROM dblink('v3_db', $1::text) AS v3(${columns});`, [sql]);
	}

	async #executeOnV3(entityManager: EntityManager, sql: string): Promise<void> {
		await entityManager.query("SELECT dblink_exec('v3_db', $1::text);", [sql]);
	}

	async #runWithV3Connection(callback: (entityManager: EntityManager) => Promise<void>): Promise<void> {
		const pluginConfig = await this.app
			.resolve(Providers.PluginConfiguration)
			.discover("@mainsail/snapshot-legacy-exporter", process.cwd());

		const options = pluginConfig.getRequired<DatabaseOptions>("database");
		assert.defined(options);

		const dataSource = new DataSource({
			...options,
			entities: [],
			logging: false,
			migrations: [],
			migrationsRun: false,
			synchronize: false,
		});

		await dataSource.initialize();

		const queryRunner = dataSource.createQueryRunner();

		try {
			// Link v3 database
			await queryRunner.query("CREATE EXTENSION IF NOT EXISTS dblink;");
			await queryRunner
				.query("SELECT dblink_connect('v3_db', $1);", [this.#connectionString(options.v3)])
				.catch((error) => {
					throw new Error(`Could not connect to V3: ${error.detail ?? error.message}`);
				});

			try {
				await callback(queryRunner.manager);
			} catch (error) {
				await queryRunner.query("SELECT dblink_cancel_query('v3_db');").catch(() => {});
				throw error;
			} finally {
				await queryRunner.query("SELECT dblink_disconnect('v3_db');").catch(() => {});
			}
		} finally {
			await queryRunner.release();
			await dataSource.destroy();
		}
	}

	#connectionString(v3: DatabaseOptions["v3"]): string {
		return Object.entries({
			dbname: v3.database,
			host: v3.host,
			password: v3.password,
			port: v3.port,
			user: v3.user,
		})
			.map(([key, value]) => `${key}='${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`)
			.join(" ");
	}

	async #writeSnapshot(chainTip: LegacyChainTip, wallets: LegacyWallet[]): Promise<void> {
		const hash = createHash("sha256");
		hash.update(JSON.stringify(chainTip));

		for (const wallet of wallets) {
			hash.update(JSON.stringify(wallet));
		}

		const snapshot: LegacySnapshot = {
			chainTip,
			hash: hash.digest("hex"),
			wallets,
		};

		await this.#compressToBrotli(snapshot, `distribution/snapshot/${snapshot.hash}.compressed`);
	}

	async #compressToBrotli(snapshot: LegacySnapshot, path: string): Promise<void> {
		const jsonString = JSON.stringify(snapshot);
		const compressedBuffer = await promisify(brotliCompress)(jsonString, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: 6,
				[constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(jsonString),
			},
		});
		await writeFile(path, compressedBuffer);
		this.logger.info(
			`Wrote ${JSON.stringify(snapshot.chainTip)} with ${snapshot.wallets.length} wallets to '${path}'`,
		);
	}
}

// Wrote 207659 wallets to 'distribution/snapshot/19a87c96dbe8ad1be06d33e97cd17f5662eb952c29efd3d8bb00c9c75e7582bc.compressed'

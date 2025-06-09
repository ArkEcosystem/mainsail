import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Providers } from "@mainsail/kernel";
import { assert } from "@mainsail/utils";
import { DataSource, EntityManager } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

import { Identifiers as InternalIdentifiers } from "../identifiers.js";
import { LegacyChainTip, LegacySnapshot, LegacyWallet } from "../interfaces.js";

interface DatabaseOptions extends PostgresConnectionOptions {
	readonly v3: {
		readonly host: string;
		readonly port: number;
		readonly user: string;
		readonly password: string;
		readonly database: string;
	};
}

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

	public async generate(): Promise<void> {
		await this.#runInTransaction(async (entityManager) => {
			this.logger.info("connected!");

			const [chainTip] = await entityManager.query(
				"SELECT * FROM dblink('v3_db', 'SELECT id, height FROM blocks ORDER BY height DESC LIMIT 1') AS blocks(hash varchar, number bigint);",
			);

			const addressFactory = this.app.get<Contracts.Crypto.AddressFactory>(
				Identifiers.Cryptography.Identity.Address.Factory,
			);

			// Loop all wallets
			const limit = 1000;
			let offset = 0;

			const wallets: LegacyWallet[] = [];
			for (;;) {
				this.logger.info(`Fetching wallets (offset: ${offset}, limit: ${limit})`);

				const chunk: LegacyWallet[] = await entityManager.query(`
					SELECT * FROM dblink(
						'v3_db',
						'
							SELECT address, public_key, balance, attributes FROM wallets
							ORDER BY balance DESC, address ASC LIMIT ${limit} OFFSET ${offset}
						'
					) AS wallets("arkAddress" varchar, "publicKey" varchar, balance bigint, attributes jsonb);
				`);

				for (const wallet of chunk) {
					// sanitize
					if (wallet.attributes?.["delegate"]) {
						delete wallet.attributes?.["delegate"]["lastBlock"];
					}

					delete wallet.attributes?.["ipfs"]; // ?
					delete wallet.attributes?.["business"]; // ?
					delete wallet.attributes?.["htlc"]; // ?
					delete wallet.attributes?.["entities"]; // ?

					wallets.push({
						...wallet,
						...(wallet.publicKey
							? {
									ethAddress: await addressFactory.fromPublicKey(wallet.publicKey),
								}
							: {}),
					});
				}

				offset += limit;

				if (chunk.length === 0) {
					break;
				}
			}

			await this.#writeSnapshot(chainTip, wallets);
		});
	}

	async #runInTransaction(callback: (entityManager: EntityManager) => Promise<void>): Promise<void> {
		const pluginConfig = await this.app
			.resolve(Providers.PluginConfiguration)
			.discover("@mainsail/snapshot-legacy-exporter", process.cwd());

		const options = pluginConfig.get<DatabaseOptions>("database");
		assert.defined(options);

		const dataSource = new DataSource({
			...options,
			entities: [],
			migrations: [],
			migrationsRun: false,
			synchronize: false,
		});

		await dataSource.initialize();

		try {
			await dataSource.transaction("REPEATABLE READ", async (entityManager) => {
				// Link v3 database
				await entityManager.query(`
							CREATE EXTENSION IF NOT EXISTS dblink;
							SELECT dblink_connect('v3_db', 'host=${options.v3.host} port=${options.v3.port} dbname=${options.v3.database} user=${options.v3.user} password=${options.v3.password}');
						`);

				await callback(entityManager);
			});
		} catch (ex) {
			this.logger.error(ex);
		} finally {
			await dataSource.destroy();
		}
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
		const compressedBuffer = await promisify(brotliCompress)(jsonString);
		await writeFile(path, compressedBuffer);
		this.logger.info(`Wrote ${snapshot.wallets.length} wallets to '${path}'`);
	}
}

// Wrote 207659 wallets to 'distribution/snapshot/19a87c96dbe8ad1be06d33e97cd17f5662eb952c29efd3d8bb00c9c75e7582bc.compressed'

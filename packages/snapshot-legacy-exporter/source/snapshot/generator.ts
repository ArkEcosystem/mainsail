import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { inject, injectable } from "@mainsail/container";
import { Application, Providers, Utils } from "@mainsail/kernel";
import { DataSource } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

import { Identifiers as InternalIdentifiers } from "../identifiers.js";
import { LegacySnapshot, LegacyWallet } from "../interfaces.js";

interface DatabaseOptions extends PostgresConnectionOptions {
	readonly v3: {
		readonly user: string;
		readonly password: string;
		readonly database: string;
	};
}

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	private app!: Application;

	async #connect(): Promise<DataSource> {
		const pluginConfig = await this.app
			.resolve(Providers.PluginConfiguration)
			.discover("@mainsail/snapshot-legacy-exporter", process.cwd());

		const options = pluginConfig.get<DatabaseOptions>("database");
		Utils.assert.defined<DatabaseOptions>(options);

		const dataSource = new DataSource({
			...options,
			entities: [],
			migrations: [],
			migrationsRun: false,
			synchronize: false,
		});

		await dataSource.initialize();

		// Link v3 database
		await dataSource.query(`
			CREATE EXTENSION IF NOT EXISTS dblink;
			SELECT dblink_connect('v3_db', 'dbname=${options.v3.database} user=${options.v3.user} password=${options.v3.password}');
		`);

		return dataSource;
	}

	public async generate(): Promise<void> {
		// Connect to V3 database
		const dataSource = await this.#connect();
		console.log("connected!");

		const hash = createHash("sha256");

		const [chainTip] = await dataSource.query(
			"SELECT * FROM dblink('v3_db', 'SELECT id, height FROM blocks ORDER BY height DESC LIMIT 1') AS blocks(id varchar, height bigint);",
		);
		hash.update(JSON.stringify(chainTip));

		// Loop all wallets
		const limit = 1000;
		let offset = 0;

		const wallets: LegacyWallet[] = [];
		for (;;) {
			const chunk: LegacyWallet[] = await dataSource.query(`
				SELECT * FROM dblink(
					'v3_db',
					'
						SELECT address, public_key, balance, nonce, attributes FROM wallets -- WHERE attributes ?| array[''vote'', ''delegate'', ''username'']
						ORDER BY balance DESC, address ASC LIMIT ${limit} OFFSET ${offset}
					'
				) AS wallets(address varchar, "publicKey" varchar, balance bigint, nonce bigint, attributes jsonb);
			`);

			for (const wallet of chunk) {
				// sanitize
				if (wallet.attributes["delegate"]) {
					delete wallet.attributes["delegate"]["lastBlock"];
				}

				delete wallet.attributes["ipfs"]; // ?
				delete wallet.attributes["business"]; // ?
				delete wallet.attributes["htlc"]; // ?
				delete wallet.attributes["entities"]; // ?

				hash.update(JSON.stringify(wallet));
				wallets.push(wallet);
			}

			offset += limit;

			if (chunk.length === 0) {
				break;
			}
		}

		// Write snapshot
		const snapshot: LegacySnapshot = {
			chainTip,
			hash: hash.digest("hex"),
			wallets,
		};

		const path = `distribution/snapshot/snapshot-${snapshot.hash}.json`;

		// TODO: to reduce size we can compress it

		await writeFile(path, JSON.stringify(snapshot, undefined, 2));

		console.log(`Wrote ${wallets.length} wallets to '${path}'`);

		await dataSource.destroy();
	}
}

// Wrote 207659 wallets to 'distribution/snapshot/snapshot-19a87c96dbe8ad1be06d33e97cd17f5662eb952c29efd3d8bb00c9c75e7582bc.json'

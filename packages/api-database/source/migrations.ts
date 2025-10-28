import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { DataSource, QueryFailedError } from "typeorm";

import { Migrations as ApiDatabaseContracts_Migrations } from "./contracts.js";
import { Identifiers as ApiDatabaseIdentifiers } from "./identifiers.js";

@injectable()
export class Migrations implements ApiDatabaseContracts_Migrations {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: DataSource;

	public async synchronizeEntities(): Promise<void> {
		try {
			// Manually run 'synchronize' to create entity tables once. We cannot rely on TypeORM to run it unconditionally
			// when creating the datasource since it will fail to establish a connection when it runs into the 'Table already exists' error.
			await this.dataSource.synchronize(false);
		} catch (error) {
			if (!(error instanceof QueryFailedError)) {
				throw error;
			}

			// https://www.postgresql.org/docs/current/errcodes-appendix.html
			// 42P07 	duplicate_table
			if ((error as any).code !== "42P07") {
				throw error;
			}

			this.logger.debug(`entities already synchronized`);
		}
	}

	public async runMigrations(): Promise<void> {
		this.logger.info(`Running migrations...`);

		const [result] = await this.dataSource.manager.query(`SHOW statement_timeout`);
		const oldTimeout = result.statement_timeout;
		try {
			await this.dataSource.manager.query(`SET statement_timeout = 0`);

			const migrations = await this.dataSource.runMigrations({ transaction: "all" });
			for (const migration of migrations) {
				this.logger.info(`>>> ${migration.name}`);
			}
		} catch (error) {
			await this.app.terminate("failed to run migrations", error);
		} finally {
			await this.dataSource.manager.query(`SET statement_timeout = '${oldTimeout}'`);
		}
	}
}

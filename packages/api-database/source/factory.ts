import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { DataSource } from "typeorm";
import { type PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { DatabaseFactory } from "./contracts";
import { Block } from "./models/block";
import { Transaction } from "./models/transaction";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy";

@injectable()
export class Factory implements DatabaseFactory {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#dataSources: DataSource[] = [];

	public async make(options: PostgresConnectionOptions): Promise<DataSource> {
		if (!options.applicationName) {
			throw new Error("missing applicationName");
		}

		this.logger.info(`Connecting to database: ${options.database} [${options.applicationName}]`);

		const dataSource = new DataSource({
			...options,
			// TODO: merge entities with passed options to allow extension by plugins
			entities: [Block, Transaction],

			namingStrategy: new SnakeNamingStrategy(),
		});

		await dataSource.initialize();

		// This package takes care of cleaning up connections
		this.#dataSources.push(dataSource);

		return dataSource;
	}

	public async destroy(): Promise<void> {
		for (const dataSource of this.#dataSources) {
			await dataSource.destroy();
		}
	}
}

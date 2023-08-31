import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { Identifiers as ApiSyncIdentifiers } from "./identifiers";
import { makeBlockRepository } from "./repositories";
import { Sync } from "./sync";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.configureDatabase();

		this.app.bind(Identifiers.ApiSync).to(Sync).inSingletonScope();
	}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {}

	private async configureDatabase(): Promise<void> {
		const options = this.config().get<ApiDatabaseContracts.PostgresConnectionOptions>("database");
		Utils.assert.defined<ApiDatabaseContracts.PostgresConnectionOptions>(options);

		try {
			const dataSource = await this.app
				.get<ApiDatabaseContracts.DatabaseFactory>(ApiDatabaseIdentifiers.Factory)
				.make(options);

			this.app.bind(ApiSyncIdentifiers.DataSource).toConstantValue(dataSource);
			this.app.bind(ApiSyncIdentifiers.BlockRepository).toConstantValue(makeBlockRepository(dataSource));
		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}
}

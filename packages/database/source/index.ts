import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { open, RootDatabase } from "lmdb";
import { join } from "path";

import { DatabaseService } from "./database-service.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerStorage();

		this.app.bind(Identifiers.Database.Service).to(DatabaseService).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).initialize();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).persist();
		await this.app.get<RootDatabase>(Identifiers.Database.Root).close();
	}

	#registerStorage() {
		const rootStorage = open({
			compression: true,
			name: "core",
			path: join(this.app.dataPath(), "ledger.mdb"),
		});
		this.app.bind(Identifiers.Database.Root).toConstantValue(rootStorage);
		this.app.bind(Identifiers.Database.Storage.Block).toConstantValue(rootStorage.openDB({ name: "blocks" }));
		this.app.bind(Identifiers.Database.Storage.BlockId).toConstantValue(rootStorage.openDB({ name: "block-id" }));
		this.app.bind(Identifiers.Database.Storage.State).toConstantValue(rootStorage.openDB({ name: "state" }));
	}
}

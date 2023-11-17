import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { RootDatabase } from "lmdb";

import { DatabaseService } from "./database-service";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const rootStorage = this.app.get<RootDatabase>(Identifiers.Database.RootStorage);

		this.app.bind(Identifiers.Database.BlockStorage).toConstantValue(rootStorage.openDB({ name: "blocks" }));

		this.app
			.bind(Identifiers.Database.BlockHeightStorage)
			.toConstantValue(rootStorage.openDB({ name: "blocks-by-height" }));

		this.app.bind(Identifiers.Database.Service).to(DatabaseService).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}

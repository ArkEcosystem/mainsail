import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { DatabaseService } from "./database-service.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Database.Service).to(DatabaseService).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).initialize();
	}

	public async dispose(): Promise<void> {}
}

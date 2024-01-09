import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { RootDatabase, open } from "lmdb";
import { DatabaseService } from "./database-service";
import { join } from "path";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerStorage();

		this.app.bind(Identifiers.Database.Service).to(DatabaseService).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service).persist();
		await this.app.get<RootDatabase>(Identifiers.Database.RootStorage).close();
	}

	#registerStorage() {
		const rootStorage = open({
			compression: true,
			name: "core",
			path: join(this.app.dataPath(), "ledger.mdb"),
		});
		this.app.bind(Identifiers.Database.RootStorage).toConstantValue(rootStorage);
		this.app.bind(Identifiers.Database.BlockStorage).toConstantValue(rootStorage.openDB({ name: "blocks" }));

		const consensusStorage = open({
			compression: true,
			name: "consensus",
			path: join(this.app.dataPath(), "consensus.mdb"),
		});
		this.app.bind(Identifiers.Database.ConsensusStorage).toConstantValue(consensusStorage);
	}
}

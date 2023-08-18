import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { open } from "lmdb";
import { join } from "path";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const rootStorage = open({
			compression: true,
			name: "core",
			path: join(this.app.dataPath(), "ledger.mdb"),
		});

		this.app.bind(Identifiers.Database.RootStorage).toConstantValue(rootStorage);

		const consensusStorage = open({
			compression: true,
			name: "consensus",
			path: join(this.app.dataPath(), "consensus.mdb"),
		});
		this.app.bind(Identifiers.Database.ConsensusStorage).toConstantValue(consensusStorage);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}

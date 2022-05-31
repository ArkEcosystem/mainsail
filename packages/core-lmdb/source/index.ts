import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import { open } from "lmdb";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const rootStorage = open({
			compression: true,
			name: "core",
			path: this.app.dataPath(),
		});

		this.app.bind(Identifiers.Database.RootStorage).toConstantValue(rootStorage);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}

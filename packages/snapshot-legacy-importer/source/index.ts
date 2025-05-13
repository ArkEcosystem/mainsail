import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Importer } from "./importer.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Snapshot.Legacy.Importer).to(Importer).inSingletonScope();
	}

	public async required(): Promise<boolean> {
		return true;
	}
}

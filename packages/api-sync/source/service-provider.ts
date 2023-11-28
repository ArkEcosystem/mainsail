import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Identifiers as ApiSyncIdentifiers } from "./identifiers";
import { Listeners } from "./listeners";
import { Sync } from "./sync";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(ApiSyncIdentifiers.Listeners).to(Listeners).inSingletonScope();
		this.app.bind(Identifiers.ApiSync).to(Sync).inSingletonScope();

		// Listen to events during register, so we can catch all boot events.
		await this.app.get<Listeners>(ApiSyncIdentifiers.Listeners).register();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Listeners>(ApiSyncIdentifiers.Listeners).dispose();
	}
}

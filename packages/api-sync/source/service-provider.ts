import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Listeners } from "./listeners";
import { Sync } from "./sync";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ApiSync.Listener).to(Listeners).inSingletonScope();
		this.app.bind(Identifiers.ApiSync.Service).to(Sync).inSingletonScope();

		// Listen to events during register, so we can catch all boot events.
		await this.app.get<Listeners>(Identifiers.ApiSync.Listener).register();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Listeners>(Identifiers.ApiSync.Listener).dispose();
	}
}

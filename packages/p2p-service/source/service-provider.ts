import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { HelloRoute } from "./routes/index.js";
import { Service } from "./service.js";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		for (const route of [HelloRoute]) {
			this.app.bind(Identifiers.P2P.WebSocket.Routes).to(route).inSingletonScope();
		}

		this.app.bind(Identifiers.P2PService.Service).to(Service).inSingletonScope();
	}

	// TEMPORARY: booted from the provider so it runs next to the old p2p without touching the
	// bootstrapper. Once this package replaces @mainsail/p2p the bootstrapper takes over.
	public async boot(): Promise<void> {
		await this.app.get<Service>(Identifiers.P2PService.Service).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Service>(Identifiers.P2PService.Service).dispose();
	}
}

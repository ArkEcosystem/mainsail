import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { HelloRoute } from "./routes/index.js";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		for (const route of [HelloRoute]) {
			this.app.bind(Identifiers.P2P.WebSocket.Routes).to(route).inSingletonScope();
		}
	}
}

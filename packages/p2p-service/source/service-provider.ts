import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// The bootstrapper drives boot() and dispose() of the transport through this identifier.
		this.app.bind(Identifiers.P2P.Server).toService(Identifiers.P2P.WebSocket.Service);
	}
}

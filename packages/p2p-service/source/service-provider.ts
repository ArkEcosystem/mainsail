import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		//
	}
}

import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

// The directory of public API nodes: learned from the peers, checked over HTTP and announced to the API.
// Not needed for consensus, so a node that does not serve an API leaves this plugin out. Requires the
// @mainsail/p2p-service service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Nothing is bound yet; the API node services are ported from @mainsail/p2p next.
	}

	// Mirrors defaults.ts.
	public configSchema(): Joi.AnySchema {
		return Joi.object({}).unknown(true);
	}
}

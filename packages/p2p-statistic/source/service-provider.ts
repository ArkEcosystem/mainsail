import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

// Per-round statistics of the peer layer: request timings and peers coming and going, for the log and
// the development API. Nothing in consensus or sync reads them, so a node may leave this plugin out.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Nothing is bound yet; the statistic services are ported from @mainsail/p2p next.
	}

	// Mirrors defaults.ts.
	public configSchema(): Joi.AnySchema {
		return Joi.object({}).unknown(true);
	}
}

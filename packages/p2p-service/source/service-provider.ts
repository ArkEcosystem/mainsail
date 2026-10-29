import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { Logger } from "./logger.js";
import { GetStatusRoute } from "./routes/index.js";
import { Service } from "./service.js";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.P2P.Logger).to(Logger).inSingletonScope();

		for (const route of [GetStatusRoute]) {
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

	// Mirrors defaults.ts; the listening address is validated by @mainsail/p2p-websocket.
	public configSchema(): Joi.AnySchema {
		return Joi.object({
			blacklist: Joi.array().items(Joi.string()).required(),
			disableDiscovery: Joi.bool(),
			getBlocksTimeout: Joi.number().integer().min(0).required(),
			ignoreMinimumNetworkReach: Joi.bool(),
			maxPeersBroadcast: Joi.number().integer().min(0).required(),
			maxSameSubnetPeers: Joi.number().integer().min(0).required(),
			minimumNetworkReach: Joi.number().integer().min(0).required(),
			minimumVersions: Joi.array().items(Joi.string()).required(),
			peerBanTime: Joi.number().integer().min(0).required(),
			remoteAccess: Joi.array()
				.items(Joi.string().ip({ version: ["ipv4", "ipv6"] }))
				.required(),
			skipPeerStateVerification: Joi.bool(),
			txPoolPort: Joi.number().integer().min(0).required(),
			verifyTimeout: Joi.number().integer().min(0).required(),
			whitelist: Joi.array().items(Joi.string()).required(),
		}).unknown(true);
	}
}

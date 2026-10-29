import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import { assert, IpAddress } from "@mainsail/utils";
import Joi from "joi";

import { Header } from "./header.js";
import { Logger } from "./logger.js";
import { PeerRepository } from "./peer-repository.js";
import { Peer } from "./peer.js";
import { PendingCommits } from "./pending-commits.js";
import { GetStatusRoute } from "./routes/index.js";
import { Service } from "./service.js";
import { State } from "./state.js";

// Requires the @mainsail/p2p-websocket service provider to be registered first.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.P2P.Logger).to(Logger).inSingletonScope();
		this.app.bind(Identifiers.P2P.Peer.Repository).to(PeerRepository).inSingletonScope();
		this.app.bind(Identifiers.P2P.State).to(State).inSingletonScope();
		this.app.bind(Identifiers.P2P.PendingCommits).to(PendingCommits).inSingletonScope();
		this.app.bind<() => Header>(Identifiers.P2P.Header.Factory).toFactory(() => () => this.app.resolve(Header));

		// Peers are assumed to listen on the same port we do; it is configured on the transport.
		this.app.bind<(ip: string) => Peer>(Identifiers.P2P.Peer.Factory).toFactory(() => (ip: string) => {
			const sanitizedIp = IpAddress.sanitizeRemoteAddress(ip);
			assert.string(sanitizedIp);

			return this.app
				.resolve(Peer)
				.init(sanitizedIp, Number(this.#transportConfiguration().getRequired<number>("server.port")));
		});

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

	#transportConfiguration(): Contracts.Kernel.PluginConfiguration {
		return this.app.getTagged<Contracts.Kernel.PluginConfiguration>(
			Identifiers.ServiceProvider.Configuration,
			"plugin",
			"p2p-websocket",
		);
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

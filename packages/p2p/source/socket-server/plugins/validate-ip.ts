import { ResponseToolkit } from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { getPeerIp } from "../../utils/index.js";
import { BasePlugin } from "./base-plugin.js";

@injectable()
export class ValidateIpPlugin extends BasePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Processor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		if (this.configuration.getRequired("developmentMode.enabled")) {
			return;
		}

		server.ext({
			method: async (request: Contracts.P2P.Request, h: ResponseToolkit) => {
				const ip = getPeerIp(request);

				if (this.peerDisposer.isBanned(ip)) {
					return this.banAndReturnBadRequest(request, h, "Validation failed (peer is bannned)");
				}

				if (!this.peerProcessor.validatePeerIp(ip)) {
					return this.disposeAndReturnBadRequest(request, h, "Validation failed (bad ip)");
				}

				return h.continue;
			},
			type: "onPreAuth",
		});
	}
}

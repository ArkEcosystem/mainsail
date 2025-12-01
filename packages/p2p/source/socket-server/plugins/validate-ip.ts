import type { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/index.js";
import { BasePlugin } from "./base-plugin.js";

@injectable()
export class ValidateIpPlugin extends BasePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Processor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server: Server): void {
		if (this.configuration.getRequired("developmentMode.enabled")) {
			return;
		}

		server.ext({
			method: async (request, h) => {
				const peerRequest = request as Contracts.P2P.Request;
				const ip = getPeerIp(peerRequest);

				if (this.peerDisposer.isBanned(ip)) {
					return this.banAndReturnBadRequest(peerRequest, h, "Validation failed (peer is bannned)");
				}

				if (!this.peerProcessor.validatePeerIp(ip)) {
					return this.disposeAndReturnBadRequest(peerRequest, h, "Validation failed (bad ip)");
				}

				return h.continue;
			},
			type: "onPreAuth",
		});
	}
}

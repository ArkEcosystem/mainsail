import { ResponseToolkit } from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { getPeerIp, isValidVersion } from "../../utils";
import {
	GetApiNodesRoute,
	GetBlocksRoute,
	GetMessagesRoute,
	GetPeersRoute,
	GetProposalRoute,
	GetStatusRoute,
	PostPrecommitRoute,
	PostPrevoteRoute,
	PostProposalRoute,
	PostTransactionsRoute,
} from "../routes";
import { BasePlugin } from "./base-plugin";

@injectable()
export class ValidatePlugin extends BasePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		if (this.configuration.getRequired("developmentMode.enabled")) {
			return;
		}

		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetMessagesRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetApiNodesRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStatusRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrecommitRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrevoteRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
		};

		server.ext({
			method: async (request: Contracts.P2P.Request, h: ResponseToolkit) => {
				if (!this.peerProcessor.validatePeerIp(getPeerIp(request))) {
					return this.disposeAndReturnBadRequest(request, h, "Validation failed (bad ip)");
				}

				const version = request.payload?.headers?.version;
				if (version && !isValidVersion(this.app, version)) {
					return this.disposeAndReturnBadRequest(request, h, "Validation failed (invalid version)");
				}

				const result = allRoutesConfigByPath[request.path]?.validation?.validate(request.payload);
				if (result && result.error) {
					return this.banAndReturnBadRequest(request, h, "Validation failed (bad payload)");
				}
				return h.continue;
			},
			type: "onPostAuth",
		});
	}
}

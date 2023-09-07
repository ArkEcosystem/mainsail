import Boom from "@hapi/boom";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { getPeerIp, isValidVersion } from "../../utils";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetMessagesRoute,
	GetPeersRoute,
	GetProposalRoute,
	GetStatusRoute,
	PostPrecommitRoute,
	PostPrevoteRoute,
	PostProposalRoute,
	PostTransactionsRoute,
} from "../routes";

@injectable()
export class ValidatePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	public register(server) {
		if (this.configuration.getRequired("developmentMode.enabled")) {
			return;
		}

		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetMessagesRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStatusRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrecommitRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrevoteRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
		};

		server.ext({
			method: async (request, h) => {
				if (!this.peerProcessor.validatePeerIp(getPeerIp(request))) {
					return this.#disposeAndReturnBadRequest(request, "Validation failed");
				}

				const version = request.payload?.headers?.version;
				if (version && !isValidVersion(this.app, version)) {
					return this.#disposeAndReturnBadRequest(request, "Validation failed (invalid version)");
				}

				const result = allRoutesConfigByPath[request.path]?.validation?.validate(request.payload);
				if (result && result.error) {
					return this.#banAndReturnBadRequest(request, "Validation failed");
				}
				return h.continue;
			},
			type: "onPostAuth",
		});
	}

	#disposeAndReturnBadRequest = (request: Contracts.P2P.Request, error: string) => {
		this.peerDisposer.disposePeer({ ip: getPeerIp(request) });
		return Boom.badRequest(error);
	};

	#banAndReturnBadRequest = (request: Contracts.P2P.Request, error: string) => {
		this.peerDisposer.banPeer({ ip: getPeerIp(request) }, new Error(error), false);
		return Boom.badRequest(error);
	};
}

import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import Boom from "@hapi/boom";

import { InternalRoute } from "../routes/internal";

@injectable()
export class WhitelistForgerPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		const peerRoutesConfigByPath = this.app.resolve(InternalRoute).getRoutesConfigByPath();
		const peerProcessor = this.peerProcessor;

		server.ext({
			async method(request, h) {
				if (peerRoutesConfigByPath[request.path]) {
					if (peerProcessor.isWhitelisted({ ip: request.info.remoteAddress } as Contracts.P2P.Peer)) {
						return h.continue;
					} else {
						return Boom.forbidden("IP unauthorized on internal route");
					}
				} else {
					return h.continue;
				}
			},
			type: "onPreAuth",
		});
	}
}

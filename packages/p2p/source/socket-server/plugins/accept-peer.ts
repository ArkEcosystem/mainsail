import type Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/index.js";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

@injectable()
export class AcceptPeerPlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Peer.Processor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server: Hapi.Server) {
		const peerProcessor = this.peerProcessor;

		server.ext({
			async method(request: Hapi.Request, h: Hapi.ResponseToolkit) {
				const ip = getPeerIp(request as Contracts.P2P.Request);
				void peerProcessor.validateAndAcceptPeer(ip);

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

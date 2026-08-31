import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { getPeerIp } from "../../utils/get-peer-ip.js";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/typedef */

@injectable()
export class HeaderHandlePlugin {
	@inject(Identifiers.P2P.Header.Service)
	private readonly headerService!: Contracts.P2P.HeaderService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public register(server) {
		server.ext({
			method: async (request: Contracts.P2P.Request, h) => {
				const peerIp = getPeerIp(request);

				if (this.peerRepository.hasPeer(peerIp)) {
					const peer = this.peerRepository.getPeer(peerIp);

					void this.headerService.handle(peer, request.payload.headers);
				}

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

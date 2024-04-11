import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/get-peer-ip.js";

@injectable()
export class HeaderHandlePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Header.Service)
	private readonly headerService!: Contracts.P2P.HeaderService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public register(server) {
		const headerService = this.headerService;
		const peerRepository = this.peerRepository;

		server.ext({
			async method(request: Contracts.P2P.Request, h) {
				const peerIp = getPeerIp(request);

				if (peerRepository.hasPeer(peerIp)) {
					const peer = peerRepository.getPeer(peerIp);

					void headerService.handle(peer, request.payload.headers);
				}

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

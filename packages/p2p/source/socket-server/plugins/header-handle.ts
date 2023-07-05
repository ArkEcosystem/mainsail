import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/get-peer-ip";

@injectable()
export class HeaderHandlePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerHeaderService)
	private readonly headerService!: Contracts.P2P.IHeaderService;

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public register(server) {
		const header = this.headerService;
		const peerRepository = this.peerRepository;

		server.ext({
			async method(request, h) {
				const peerIp = request.socket ? getPeerIp(request.socket) : request.info.remoteAddress;

				if (peerRepository.hasPeer(peerIp)) {
					const peer = peerRepository.getPeer(peerIp);

					void header.handle(peer, request.payload.headers);
				}

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

import { inject, injectable } from "@mainsail/core-container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";

import { getPeerIp } from "../../utils/get-peer-ip";

@injectable()
export class AcceptPeerPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		const peerProcessor = this.peerProcessor;

		server.ext({
			async method(request, h) {
				const peerIp = request.socket ? getPeerIp(request.socket) : request.info.remoteAddress;
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				peerProcessor.validateAndAcceptPeer({
					ip: peerIp,
				} as Contracts.P2P.Peer);

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

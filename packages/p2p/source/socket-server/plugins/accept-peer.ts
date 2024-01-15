import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils";

@injectable()
export class AcceptPeerPlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Peer.Processor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		const peerProcessor = this.peerProcessor;

		server.ext({
			async method(request: Contracts.P2P.Request, h) {
				const ip = getPeerIp(request);
				void peerProcessor.validateAndAcceptPeer(ip);

				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

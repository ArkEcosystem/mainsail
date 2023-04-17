import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { getPeerIp } from "../../utils/get-peer-ip";
import { BlocksRoute } from "../routes/blocks";
import { PeerRoute } from "../routes/peer";
import { TransactionsRoute } from "../routes/transactions";

@injectable()
export class AcceptPeerPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	public register(server) {
		// try to add peer when receiving request on all routes except internal
		const routesConfigByPath = {
			...this.app.resolve(PeerRoute).getRoutesConfigByPath(),
			...this.app.resolve(BlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(TransactionsRoute).getRoutesConfigByPath(),
		};
		const peerProcessor = this.peerProcessor;

		server.ext({
			async method(request, h) {
				if (routesConfigByPath[request.path]) {
					const peerIp = request.socket ? getPeerIp(request.socket) : request.info.remoteAddress;
					// eslint-disable-next-line @typescript-eslint/no-floating-promises
					peerProcessor.validateAndAcceptPeer({
						ip: peerIp,
					} as Contracts.P2P.Peer);
				}
				return h.continue;
			},
			type: "onPreHandler",
		});
	}
}

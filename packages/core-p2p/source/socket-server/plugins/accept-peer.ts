import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { getPeerIp } from "../../utils/get-peer-ip";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetPeersRoute,
	GetStausRoute,
	PostBlockRoute,
	PostTransactionsRoute,
} from "../routes";

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

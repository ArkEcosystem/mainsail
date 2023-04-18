import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import Hapi from "@hapi/hapi";

import { constants } from "../../constants";
import { getPeerIp } from "../../utils/get-peer-ip";

@injectable()
export class GetPeersController {
	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Contracts.P2P.PeerBroadcast[] {
		const peerIp = getPeerIp(request.socket);

		return this.peerRepository
			.getPeers()
			.filter((peer) => peer.ip !== peerIp)
			.filter((peer) => peer.port !== -1)
			.sort((a, b) => {
				Utils.assert.defined<number>(a.latency);
				Utils.assert.defined<number>(b.latency);

				return a.latency - b.latency;
			})
			.slice(0, constants.MAX_PEERS_GETPEERS)
			.map((peer) => peer.toBroadcast());
	}
}

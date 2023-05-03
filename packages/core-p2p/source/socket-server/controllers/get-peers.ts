import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { Utils } from "@mainsail/core-kernel";
import Hapi from "@hapi/hapi";

import { constants } from "../../constants";
import { getPeerIp } from "../../utils/get-peer-ip";

@injectable()
export class GetPeersController implements Contracts.P2P.Controller {
	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.PeerBroadcast[]> {
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

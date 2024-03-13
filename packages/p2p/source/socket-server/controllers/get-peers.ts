import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { constants } from "../../constants.js";
import { getPeerIp } from "../../utils/get-peer-ip.js";

@injectable()
export class GetPeersController implements Contracts.P2P.Controller {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public async handle(
		request: Contracts.P2P.Request,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetPeersResponse> {
		const peerIp = getPeerIp(request);

		return {
			peers: this.peerRepository
				.getPeers()
				.filter((peer) => peer.ip !== peerIp)
				.filter((peer) => peer.port !== -1)
				.sort((a, b) => {
					Utils.assert.defined<number>(a.latency);
					Utils.assert.defined<number>(b.latency);

					return a.latency - b.latency;
				})
				.slice(0, constants.MAX_PEERS_GET_PEERS)
				.map((peer) => peer.toBroadcast()),
		};
	}
}

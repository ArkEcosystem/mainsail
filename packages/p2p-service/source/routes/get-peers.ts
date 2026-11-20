import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";
import { constants } from "../constants.js";

type Request = ReturnType<typeof Codecs.getPeers.request.deserialize>;
type Response = ReturnType<typeof Codecs.getPeers.response.deserialize>;

export const GetPeers: Interfaces.RouteDefinition<Request, Response> = { codec: Codecs.getPeers, path: "getPeers" };

@injectable()
export class GetPeersRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	public readonly path = GetPeers.path;
	public readonly codec = GetPeers.codec;

	public async handle(connection: Interfaces.Connection): Promise<Response> {
		return {
			peers: this.peerRepository
				.getPeers()
				.filter((peer) => peer.ip !== connection.remoteAddress)
				// Peers are accepted before they answered anything, so some have no latency yet; those go last.
				.sort((a, b) => (a.latency ?? Number.POSITIVE_INFINITY) - (b.latency ?? Number.POSITIVE_INFINITY))
				.slice(0, constants.MAX_PEERS_GET_PEERS)
				.map((peer) => peer.toBroadcast()),
		};
	}
}

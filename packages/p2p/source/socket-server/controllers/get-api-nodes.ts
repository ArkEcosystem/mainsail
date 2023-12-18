import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { constants } from "../../constants";

@injectable()
export class GetApiNodesController implements Contracts.P2P.Controller {
	@inject(Identifiers.PeerApiNodeRepository)
	private readonly peerApiNodeRepository!: Contracts.P2P.PeerApiNodeRepository;

	public async handle(
		request: Contracts.P2P.Request,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetApiNodesResponse> {
		return {
			apiNodes: this.peerApiNodeRepository
				.getApiNodes()
				.filter((node) => !!node.latency)
				.filter((node) => node.statusCode === 200)
				.sort((a, b) => {
					Utils.assert.defined<number>(a.latency);
					Utils.assert.defined<number>(b.latency);

					return a.latency - b.latency;
				})
				.slice(0, constants.MAX_PEERS_GET_API_NODES)
				.map((node) => ({ ip: node.ip, port: node.port, protocol: node.protocol })),
		};
	}
}

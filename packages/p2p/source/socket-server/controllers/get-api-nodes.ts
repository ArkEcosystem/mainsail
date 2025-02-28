import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

import { constants } from "../../constants.js";

@injectable()
export class GetApiNodesController implements Contracts.P2P.Controller {
	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly ApiNodeRepository!: Contracts.P2P.ApiNodeRepository;

	public async handle(
		request: Contracts.P2P.Request,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetApiNodesResponse> {
		return {
			apiNodes: this.ApiNodeRepository.getApiNodes()
				.filter((node) => !!node.latency)
				.filter((node) => node.statusCode === 200)
				.sort((a, b) => {
					assert.number(a.latency);
					assert.number(b.latency);

					return a.latency - b.latency;
				})
				.slice(0, constants.MAX_PEERS_GET_API_NODES)
				.map((node) => ({ url: node.url })),
		};
	}
}

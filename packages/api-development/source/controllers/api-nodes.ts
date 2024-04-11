import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { PeerResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ApiNodesController extends Controller {
	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly peerRepository!: Contracts.P2P.ApiNodeRepository;

	public async index(request: Hapi.Request) {
		const allPeers: Contracts.P2P.ApiNode[] = [...this.peerRepository.getApiNodes()];

		let results = allPeers;

		const totalCount: number = results.length;

		const limit: number = +request.query.limit || 100;

		let offset: number = +(Utils.get(request.query, "offset", 0) || 0);

		if (offset <= 0 && +request.query.page > 1) {
			offset = (+request.query.page - 1) * limit;
		}

		if (Number.isNaN(offset)) {
			offset = 0;
		}

		results = results.sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0));
		results = results.slice(offset, offset + limit);

		const resultsPage = {
			results,
			totalCount,
		};

		return super.toPagination(resultsPage, PeerResource);
	}
}

import Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { get } from "@mainsail/utils";

import { PeerResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ApiNodesController extends Controller {
	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly peerRepository!: Contracts.P2P.ApiNodeRepository;

	public async index(request: Hapi.Request): Promise<Contracts.Api.ResultsPage<object>> {
		const allPeers: Contracts.P2P.ApiNode[] = [...this.peerRepository.getApiNodes()];

		let results = allPeers;

		const totalCount: number = results.length;

		const limit: number = +request.query.limit || 100;

		let offset: number = +(get(request.query, "offset", 0) || 0);

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

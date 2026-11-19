import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional } from "@mainsail/container";
import { get } from "@mainsail/utils";

import { PeerResource } from "../resources/index.js";
import { Controller } from "./controller.js";

// The directory of API nodes comes from a plugin a node may leave out. Without it this API still starts
// and lists no nodes.
@injectable()
export class ApiNodesController extends Controller {
	@inject(Identifiers.P2P.ApiNode.Repository)
	@optional()
	private readonly apiNodeRepository?: Contracts.P2P.ApiNodeRepository;

	public async index(request: Types.HapiRequest): Promise<Contracts.Api.ResultsPage<object>> {
		const allPeers: Contracts.P2P.ApiNode[] = [...(this.apiNodeRepository?.getApiNodes() ?? [])];

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

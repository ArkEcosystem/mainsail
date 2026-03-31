import Boom from "@hapi/boom";
import type { Types } from "@mainsail/api-common";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { PeerResource } from "../resources/peer.js";
import { Controller } from "./controller.js";

@injectable()
export class PeersController extends Controller {
	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.PeerRepositoryFactory;

	public async index(request: Types.HapiRequest): Promise<object> {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.PeerCriteria = request.query;
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const peers = await this.peerRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(peers, PeerResource);
	}

	public async show(request: Types.HapiRequest): Promise<object> {
		const ip = request.params.ip;

		const peer = await this.peerRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("ip = :ip", { ip })
			.getOne();

		if (!peer) {
			return Boom.notFound("Peer not found");
		}

		return this.respondWithResource(peer, PeerResource);
	}

	protected getListingOptions(_request: Types.HapiRequest): Search.Options {
		return {
			estimateTotalCount: false,
		};
	}
}

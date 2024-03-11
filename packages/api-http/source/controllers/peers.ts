import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { PeerResource } from "../resources/peer.js";
import { Controller } from "./controller.js";

@injectable()
export class PeersController extends Controller {
	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.PeerRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.PeerCriteria = request.query;
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const peers = await this.peerRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(peers, PeerResource, request.query.transform);
	}

	public async show(request: Hapi.Request) {
		const ip = request.params.ip;

		const peer = await this.peerRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("ip = :ip", { ip })
			.getOne();

		if (!peer) {
			return Boom.notFound("Peer not found");
		}

		return this.respondWithResource(peer, PeerResource, request.query.transform);
	}

	protected getListingOptions(): Contracts.Api.Options {
		return {
			estimateTotalCount: false,
		};
	}
}

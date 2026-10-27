import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { get, orderBy } from "@mainsail/utils";
import semver from "semver";

import { BannedPeerResource, PeerResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class PeersController extends Controller {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	public async index(
		request: Types.HapiRequest,
	): Promise<Contracts.Api.ResultsPage<ReturnType<PeerResource["transform"]>> | Boom.Boom> {
		const allPeers: Contracts.P2P.Peer[] = [...this.peerRepository.getPeers()];

		let results = allPeers;

		if (request.query.version) {
			const versionRange = semver.validRange(decodeURIComponent(request.query.version));

			if (versionRange) {
				results = results.filter((peer) => peer.version && semver.satisfies(peer.version, versionRange));
			} else {
				return Boom.notFound("Invalid version range provided");
			}
		}

		const totalCount: number = results.length;

		const limit: number = +request.query.limit || 100;

		let offset: number = +(get(request.query, "offset", 0) || 0);

		if (offset <= 0 && +request.query.page > 1) {
			offset = (+request.query.page - 1) * limit;
		}

		if (Number.isNaN(offset)) {
			offset = 0;
		}

		const [order = ""]: string[] = [request.query.orderBy ?? []].flat();
		const [property = "", direction] = order.toLowerCase().split(":");
		const ascending = direction === "asc";

		switch (property) {
			case "version": {
				const version = (peer: Contracts.P2P.Peer) => semver.valid(peer.version) ?? "0.0.0";
				results = results.sort((a, b) =>
					ascending ? semver.compare(version(a), version(b)) : semver.rcompare(version(a), version(b)),
				);
				break;
			}
			case "blocknumber":
			case "height": {
				results = orderBy(results, (peer) => peer.header?.blockNumber, ascending ? "asc" : "desc");
				break;
			}
			case "latency": {
				results = orderBy(results, "latency", ascending ? "asc" : "desc");
				break;
			}
			default: {
				results = results.sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0));
				break;
			}
		}

		results = results.slice(offset, offset + limit);

		const resultsPage = {
			results,
			totalCount,
		};

		return super.toPagination(resultsPage, PeerResource);
	}

	public async show(
		request: Types.HapiRequest,
	): Promise<{ data: ReturnType<PeerResource["transform"]> } | Boom.Boom> {
		if (!this.peerRepository.hasPeer(request.params.ip)) {
			return Boom.notFound("Peer not found");
		}

		return super.respondWithResource(this.peerRepository.getPeer(request.params.ip), PeerResource);
	}

	public async banned(
		request: Types.HapiRequest,
	): Promise<Contracts.Api.ResultsPage<ReturnType<PeerResource["transform"]>> | Boom.Boom> {
		const result = this.peerDisposer.bannedPeers();

		const totalCount: number = result.length;
		const limit: number = +request.query.limit || 100;

		let offset: number = +(get(request.query, "offset", 0) || 0);

		if (offset <= 0 && +request.query.page > 1) {
			offset = (+request.query.page - 1) * limit;
		}

		return super.toPagination(
			{
				results: result.slice(offset, offset + limit),
				totalCount: totalCount,
			},
			BannedPeerResource,
		);
	}
}

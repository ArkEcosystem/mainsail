import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import semver from "semver";

import { BannedPeerResource, PeerResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class PeersController extends Controller {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	public async index(request: Hapi.Request) {
		const allPeers: Contracts.P2P.Peer[] = [...this.peerRepository.getPeers()];

		let results = allPeers;

		if (request.query.version) {
			const versionRange = semver.validRange(decodeURIComponent((request.query as any).version));

			if (versionRange) {
				results = results.filter((peer) => peer.version && semver.satisfies(peer.version, versionRange));
			} else {
				return Boom.notFound("Invalid version range provided");
			}
		}

		const totalCount: number = results.length;

		const limit: number = +request.query.limit || 100;

		let offset: number = +(Utils.get(request.query, "offset", 0) || 0);

		if (offset <= 0 && +request.query.page > 1) {
			offset = (+request.query.page - 1) * limit;
		}

		if (Number.isNaN(offset)) {
			offset = 0;
		}

		const order: string = request.query.orderBy as string;
		if (order) {
			const orderByMapped = order.split(":").map((p) => p.toLowerCase());

			switch (orderByMapped[0]) {
				case "version": {
					results =
						orderByMapped[1] === "asc"
							? results.sort((a, b) => semver.compare(a[orderByMapped[0]], b[orderByMapped[0]]))
							: results.sort((a, b) => semver.rcompare(a[orderByMapped[0]], b[orderByMapped[0]]));
					break;
				}
				case "height": {
					results = Utils.orderBy(
						results,
						(element) => element.header[orderByMapped[0]],
						orderByMapped[1] === "asc" ? "asc" : "desc", // ? why desc is default
					);
					break;
				}
				case "latency": {
					results = Utils.orderBy(results, orderByMapped[0], orderByMapped[1] === "asc" ? "asc" : "desc");
					break;
				}
				default: {
					results = results.sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0));
					break;
				}
			}
		} else {
			results = results.sort((a, b) => (a.latency ?? 0) - (b.latency ?? 0));
		}

		results = results.slice(offset, offset + limit);

		const resultsPage = {
			results,
			totalCount,
		};

		return super.toPagination(resultsPage, PeerResource);
	}

	public async show(request: Hapi.Request) {
		if (!this.peerRepository.hasPeer(request.params.ip)) {
			return Boom.notFound("Peer not found");
		}

		return super.respondWithResource(this.peerRepository.getPeer(request.params.ip), PeerResource);
	}

	public async banned(request: Hapi.Request) {
		const result = this.peerDisposer.bannedPeers();

		const totalCount: number = result.length;
		const limit: number = +request.query.limit || 100;

		let offset: number = +(Utils.get(request.query, "offset", 0) || 0);

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

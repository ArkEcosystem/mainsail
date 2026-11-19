import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers, Units } from "@mainsail/constants";
import { inject, injectable, optional } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.getApiNodes.request.deserialize>;
type Response = ReturnType<typeof Codecs.getApiNodes.response.deserialize>;

export const GetApiNodes: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.getApiNodes,
	maxConcurrentRequests: 2,
	maxPayload: { request: Units.KILOBYTE, response: 256 * Units.KILOBYTE },
	maxQueuedRequests: 1,
	path: "getApiNodes",
};

// The directory of API nodes is kept by @mainsail/p2p-api-nodes, which a node may leave out. The route
// is served here all the same, with an empty list: the paths are the protocol every node shares, and a
// request for a path a node does not have ends the connection.
@injectable()
export class GetApiNodesRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.P2P.ApiNode.Repository)
	@optional()
	private readonly apiNodeRepository?: Contracts.P2PApiNodes.ApiNodeRepository;

	public readonly path = GetApiNodes.path;
	public readonly codec = GetApiNodes.codec;
	public readonly maxPayload = GetApiNodes.maxPayload;
	public readonly maxConcurrentRequests = GetApiNodes.maxConcurrentRequests;
	public readonly maxQueuedRequests = GetApiNodes.maxQueuedRequests;

	public async handle(): Promise<Response> {
		return { apiNodes: this.apiNodeRepository?.getPublicApiNodes() ?? [] };
	}
}

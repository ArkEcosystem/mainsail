import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers, Units } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";
import { Schemas } from "../schemas/index.js";
type Request = ReturnType<typeof Codecs.getProposal.request.deserialize>;
type Response = ReturnType<typeof Codecs.getProposal.response.deserialize>;

export const GetProposal: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.getProposal,
	maxConcurrentRequests: 2,
	maxPayload: { request: Units.KILOBYTE, response: 3 * Units.MEGABYTE },
	maxQueuedRequests: 1,
	path: "getProposal",
	schema: Schemas.getProposal,
};

@injectable()
export class GetProposalRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.RoundStateRepository;

	public readonly path = GetProposal.path;
	public readonly codec = GetProposal.codec;
	public readonly maxPayload = GetProposal.maxPayload;
	public readonly maxConcurrentRequests = GetProposal.maxConcurrentRequests;
	public readonly maxQueuedRequests = GetProposal.maxQueuedRequests;
	public readonly schema = GetProposal.schema;

	public async handle(_: Interfaces.Connection, data: Request): Promise<Response> {
		const empty = { proposal: Buffer.alloc(0) };

		const { query } = data;
		if (query.blockNumber !== this.consensus.getBlockNumber() || query.round > this.consensus.getRound()) {
			return empty;
		}

		const proposal = this.roundStateRepository.getRoundState(query.blockNumber, query.round).getProposal();

		return proposal ? { proposal: proposal.serialized } : empty;
	}
}

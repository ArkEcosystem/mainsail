import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";
type Request = ReturnType<typeof Codecs.getProposal.request.deserialize>;
type Response = ReturnType<typeof Codecs.getProposal.response.deserialize>;

export const GetProposal: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.getProposal,
	path: "getProposal",
};

@injectable()
export class GetProposalRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	public readonly path = GetProposal.path;
	public readonly codec = GetProposal.codec;

	public async handle(_: Interfaces.Connection, data: Request): Promise<Response> {
		const empty = { proposal: Buffer.alloc(0) };

		const { query } = data;
		if (
			!query ||
			query.blockNumber !== this.consensus.getBlockNumber() ||
			(query.round ?? 0) > this.consensus.getRound()
		) {
			return empty;
		}

		const proposal = this.roundStateRepo.getRoundState(query.blockNumber, query.round ?? 0).getProposal();

		return proposal ? { proposal: proposal.serialized } : empty;
	}
}

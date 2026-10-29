import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";
type Request = ReturnType<typeof Codecs.getMessages.request.deserialize>;
type Response = ReturnType<typeof Codecs.getMessages.response.deserialize>;

export const GetMessages: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.getMessages,
	path: "getMessages",
};

@injectable()
export class GetMessagesRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	public readonly path = GetMessages.path;
	public readonly codec = GetMessages.codec;

	public async handle(_: Interfaces.Connection, data: Request): Promise<Response> {
		const { query } = data;
		if (
			!query ||
			query.blockNumber !== this.consensus.getBlockNumber() ||
			(query.round ?? 0) > this.consensus.getRound()
		) {
			return { precommits: [], prevotes: [] };
		}

		const roundState = this.roundStateRepo.getRoundState(query.blockNumber, query.round ?? 0);
		const signedPrevote = query.validatorsSignedPrevote ?? [];
		const signedPrecommit = query.validatorsSignedPrecommit ?? [];

		return {
			precommits: roundState
				.getPrecommits()
				.filter((precommit) => !signedPrecommit[precommit.validatorIndex])
				.map((precommit) => precommit.serialized),
			prevotes: roundState
				.getPrevotes()
				.filter((prevote) => !signedPrevote[prevote.validatorIndex])
				.map((prevote) => prevote.serialized),
		};
	}
}

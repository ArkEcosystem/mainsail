import type { Contracts } from "@mainsail/contracts";

import Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class GetMessagesController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async handle(
		request: Contracts.P2P.GetMessagesRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetMessagesResponse> {
		const consensus = this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.RoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		const { query } = request.payload;
		if (query.blockNumber !== consensus.getBlockNumber() || query.round > consensus.getRound()) {
			return {
				precommits: [],
				prevotes: [],
			};
		}

		const roundState = roundStateRepo.getRoundState(query.blockNumber, query.round);

		return {
			precommits: this.getPrecommits(query.validatorsSignedPrecommit, roundState),
			prevotes: this.getPrevotes(query.validatorsSignedPrevote, roundState),
		};
	}

	private getPrevotes(
		validatorsSignedPrevote: readonly boolean[],
		roundState: Contracts.Consensus.RoundState,
	): Buffer[] {
		return roundState
			.getPrevotes()
			.filter((prevote) => !validatorsSignedPrevote[prevote.validatorIndex])
			.map((prevote) => prevote.serialized);
	}

	private getPrecommits(
		validatorsSignedPrecommit: readonly boolean[],
		roundState: Contracts.Consensus.RoundState,
	): Buffer[] {
		return roundState
			.getPrecommits()
			.filter((precommit) => !validatorsSignedPrecommit[precommit.validatorIndex])
			.map((precommit) => precommit.serialized);
	}
}

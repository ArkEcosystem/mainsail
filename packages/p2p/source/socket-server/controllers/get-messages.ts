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
		const prevotes: Buffer[] = [];

		for (const [index, voted] of validatorsSignedPrevote.entries()) {
			if (voted) {
				continue;
			}

			const prevote = roundState.getPrevote(index);

			if (prevote) {
				prevotes.push(prevote.serialized);
			}
		}

		return prevotes;
	}

	private getPrecommits(
		validatorsSignedPrecommit: readonly boolean[],
		roundState: Contracts.Consensus.RoundState,
	): Buffer[] {
		const precommits: Buffer[] = [];

		for (const [index, voted] of validatorsSignedPrecommit.entries()) {
			if (voted) {
				continue;
			}

			const precommit = roundState.getPrecommit(index);

			if (precommit) {
				precommits.push(precommit.serialized);
			}
		}

		return precommits;
	}
}

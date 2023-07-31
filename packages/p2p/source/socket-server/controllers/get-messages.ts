import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetMessagesController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async handle(
		request: Contracts.P2P.IGetMessagesRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IGetMessagesResponse> {
		const result = {
			precommits: [],
			prevotes: [],
		};

		const { height, round, validatorsSignedPrevote, validatorsSignedPrecommit } = request.payload.headers;

		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.IRoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		if (height !== consensus.getHeight()) {
			return result;
		}

		if (round > consensus.getRound()) {
			return result;
		}

		const roundState = roundStateRepo.getRoundState(height, round);

		return {
			precommits: this.getPrecommits(validatorsSignedPrecommit, roundState),
			prevotes: this.getPrevotes(validatorsSignedPrevote, roundState),
		};
	}

	private getPrevotes(
		validatorsSignedPrevote: boolean[],
		roundState: Contracts.Consensus.IRoundState,
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
		validatorsSignedPrecommit: boolean[],
		roundState: Contracts.Consensus.IRoundState,
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

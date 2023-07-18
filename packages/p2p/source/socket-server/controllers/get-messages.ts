import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetMessagesController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

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
			precommits: await this.getPrecommits(validatorsSignedPrecommit, roundState),
			prevotes: await this.getPrevotes(validatorsSignedPrevote, roundState),
		};
	}

	private getPrevotes(
		validatorsSignedPrevote: boolean[],
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Buffer[]> {
		const prevotes: Contracts.Crypto.IPrevote[] = [];

		for (const [index, voted] of validatorsSignedPrevote.entries()) {
			if (voted) {
				continue;
			}

			const prevote = roundState.getPrevote(index);

			if (prevote) {
				prevotes.push(prevote);
			}
		}

		return Promise.all(prevotes.map(async (prevote) => await this.serializer.serializePrevote(prevote)));
	}

	private getPrecommits(
		validatorsSignedPrecommit: boolean[],
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Buffer[]> {
		const precommits: Contracts.Crypto.IPrecommit[] = [];

		for (const [index, voted] of validatorsSignedPrecommit.entries()) {
			if (voted) {
				continue;
			}

			const precommit = roundState.getPrecommit(index);

			if (precommit) {
				precommits.push(precommit);
			}
		}

		return Promise.all(precommits.map(async (prevote) => await this.serializer.serializePrecommit(prevote)));
	}
}

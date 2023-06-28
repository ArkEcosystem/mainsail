import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	public async handle(
		request: Contracts.P2P.IGetProposalRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IGetProposalResponse> {
		const result = {
			proposal: "",
		};

		const { height, round } = request.payload.headers;

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

		const roundState = await roundStateRepo.getRoundState(height, round);
		const proposal = roundState.getProposal();

		if (!proposal) {
			return result;
		}

		return {
			proposal: (await this.serializer.serializeProposal(proposal)).toString("hex"),
		};
	}
}

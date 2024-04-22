import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async handle(
		request: Contracts.P2P.GetProposalRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetProposalResponse> {
		const result = {
			proposal: Buffer.alloc(0),
		};

		const { height, round } = request.payload.headers;

		const consensus = this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.RoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		if (height !== consensus.getHeight()) {
			return result;
		}

		if (round > consensus.getRound()) {
			return result;
		}

		const roundState = roundStateRepo.getRoundState(height, round);
		const proposal = roundState.getProposal();

		if (!proposal) {
			return result;
		}

		return {
			proposal: proposal.serialized,
		};
	}
}

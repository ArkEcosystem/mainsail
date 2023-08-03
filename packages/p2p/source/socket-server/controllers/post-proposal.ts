import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.ProposalProcessor)
	private readonly proposalProcessor!: Contracts.Consensus.IProposalProcessor;

	public async handle(
		request: Contracts.P2P.IPostProposalRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostProposalResponse> {
		// TODO: Handle response
		await this.proposalProcessor.process(request.payload.proposal);

		return {};
	}
}

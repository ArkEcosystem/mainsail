import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrevoteProcessor)
	private readonly prevoteProcessor!: Contracts.Consensus.IProcessor;

	public async handle(
		request: Contracts.P2P.IPostPrevoteRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrevoteResponse> {
		// TODO: Handle response
		await this.prevoteProcessor.process(request.payload.prevote);

		return {};
	}
}

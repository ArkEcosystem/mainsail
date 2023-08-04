import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostPrecommitController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrecommitProcessor)
	private readonly precommitProcessor!: Contracts.Consensus.IProcessor;

	public async handle(
		request: Contracts.P2P.IPostPrecommitRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrecommitResponse> {
		await this.precommitProcessor.process(request.payload.precommit);

		return {};
	}
}

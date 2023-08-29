import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostPrecommitController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrecommitProcessor)
	private readonly precommitProcessor!: Contracts.Consensus.IPrecommitProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	public async handle(
		request: Contracts.P2P.IPostPrecommitRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrecommitResponse> {
		const precommit = await this.factory.makePrecommitFromBytes(request.payload.precommit);
		await this.precommitProcessor.process(precommit);

		return {};
	}
}

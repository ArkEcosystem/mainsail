import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Handler)
	private readonly consensusHandler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	public async handle(
		request: Contracts.P2P.IPostPrevoteRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrevoteResponse> {
		const prevote = await this.factory.makePrevoteFromBytes(request.payload.prevote);

		await this.consensusHandler.onPrevote(prevote);

		return {};
	}
}

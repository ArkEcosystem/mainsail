import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

interface Request extends Hapi.Request {
	payload: {
		prevote: Buffer;
	};
}

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Handler)
	private readonly consensusHandler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	public async handle(request: Request, h: Hapi.ResponseToolkit): Promise<{}> {
		const prevote = await this.factory.makePrevoteFromBytes(request.payload.prevote);

		await this.consensusHandler.onPrevote(prevote);

		return {};
	}
}

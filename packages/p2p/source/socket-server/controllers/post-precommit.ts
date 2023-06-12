import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

interface Request extends Hapi.Request {
	payload: {
		precommit: Buffer;
	};
}

@injectable()
export class PostPrecommitController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Handler)
	private readonly consensusHandler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IMessageDeserializer;

	public async handle(request: Request, h: Hapi.ResponseToolkit): Promise<{}> {
		const precommit = await this.deserializer.deserializePrevote(request.payload.precommit);

		await this.consensusHandler.onPrecommit(precommit);

		return {};
	}
}

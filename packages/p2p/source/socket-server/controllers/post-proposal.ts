import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

interface Request extends Hapi.Request {
	payload: {
		proposal: Buffer;
	};
}

@injectable()
export class PostProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Handler)
	private readonly consensusHandler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	public async handle(request: Request, h: Hapi.ResponseToolkit): Promise<{}> {
		const proposal = await this.factory.makeProposalFromBytes(request.payload.proposal);

		await this.consensusHandler.onProposal(proposal);

		return {};
	}
}

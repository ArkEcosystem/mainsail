import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostTransactionsController implements Contracts.P2P.Controller {
	@inject(Identifiers.TransactionPool.Processor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async handle(
		request: Contracts.P2P.PostTransactionsRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.PostTransactionsResponse> {
		const result = await this.processor.process(request.payload.transactions);
		return {
			accept: result.accept,
		};
	}
}

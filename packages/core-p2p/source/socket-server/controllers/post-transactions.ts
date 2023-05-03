import { inject, injectable } from "@mainsail/core-container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import Hapi from "@hapi/hapi";

@injectable()
export class PostTransactionsController implements Contracts.P2P.Controller {
	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<string[]> {
		const result = await this.processor.process((request.payload as any).transactions as Buffer[]);
		return result.accept;
	}
}

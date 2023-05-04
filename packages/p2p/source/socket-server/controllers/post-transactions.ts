import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PostTransactionsController implements Contracts.P2P.Controller {
	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<string[]> {
		const result = await this.processor.process((request.payload as any).transactions as Buffer[]);
		return result.accept;
	}
}

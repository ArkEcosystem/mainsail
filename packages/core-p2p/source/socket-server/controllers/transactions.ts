import { inject } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import Hapi from "@hapi/hapi";

import { Controller } from "./controller";

export class TransactionsController extends Controller {
	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async postTransactions(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<string[]> {
		const result = await this.processor.process((request.payload as any).transactions as Buffer[]);
		return result.accept;
	}
}

import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import Hapi from "@hapi/hapi";

import { Controller } from "../../types";

@injectable()
export class PostTransactionsController implements Controller {
	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<string[]> {
		const result = await this.processor.process((request.payload as any).transactions as Buffer[]);
		return result.accept;
	}
}

import { inject, injectable } from "@arkecosystem/core-container";
import { FastifyRequest } from "fastify";
import { Contracts, Identifiers } from "packages/core-contracts/distribution";

@injectable()
export class SubmitTransactionHandler {
	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async invoke(request: FastifyRequest): Promise<object> {
		const result = await this.processor.process((request.body as any).transactions);

		return {
			data: {
				accept: result.accept,
				broadcast: result.broadcast,
				excess: result.excess,
				invalid: result.invalid,
			},
			errors: result.errors,
		};
	}
}

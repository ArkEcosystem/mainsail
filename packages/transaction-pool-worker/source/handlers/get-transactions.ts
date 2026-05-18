import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class GetTransactionsHandler {
	@inject(Identifiers.TransactionPool.Selector)
	private readonly selector!: Contracts.TransactionPool.Selector;

	public async handle(
		options: Contracts.TransactionPool.GetBatchOptions,
	): Promise<Contracts.TransactionPool.GetBatchResult> {
		return this.selector.getBatch(options);
	}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable, inject } from "@mainsail/container";

type GetBatchOptions = {
	blockRound: string;
	maxSize: number;
	maxBytes: number;
};

type GetBatchResult = {
	transactions: Contracts.Crypto.Transaction[];
	remaining: number;
};

@injectable()
export class TransactionSelector {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	#transactions: Contracts.Crypto.Transaction[] = [];
	#currentBlockRound = "";
	#index = 0;

	public async getBatch(options: GetBatchOptions): Promise<GetBatchResult> {
		await this.#prepare(options.blockRound);

		const transactions: Contracts.Crypto.Transaction[] = [];
		let bytesLeft = options.maxBytes;

		while (this.#index < this.#transactions.length) {
			const transaction = this.#transactions[this.#index];

			if (bytesLeft - 4 - transaction.serialized.length < 0) {
				break;
			}

			transactions.push(transaction);
			bytesLeft -= 4;
			bytesLeft -= transaction.serialized.length;

			if (transactions.length >= options.maxSize) {
				break;
			}

			this.#index++;
		}

		return {
			remaining: this.#transactions.length - this.#index,
			transactions,
		};
	}

	public clear(): void {
		this.#transactions = [];
		this.#currentBlockRound = "";
		this.#index = 0;
	}

	async #prepare(blockRound: string): Promise<void> {
		if (this.#currentBlockRound === blockRound) {
			return;
		}

		this.#currentBlockRound = blockRound;
		this.#index = 0;
		this.#transactions = await this.poolQuery.getFromHighestPriority().all()
	}
}

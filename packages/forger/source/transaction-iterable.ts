import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class TransactionIterable implements AsyncIterable<Contracts.Crypto.Transaction> {
	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	#commitKey!: Contracts.Evm.CommitKey;

	public initialize(commitKey: Contracts.Evm.CommitKey): TransactionIterable {
		this.#commitKey = commitKey;
		return this;
	}

	public async *[Symbol.asyncIterator](): AsyncIterator<Contracts.Crypto.Transaction> {
		while (true) {
			const batch = await this.txPoolWorker.getTransactions({
				blockRound: `${this.#commitKey.blockNumber}-${this.#commitKey.round}`,
				maxBytes: 10_000_000,
				maxSize: 100,
			});

			for (const tx of batch.transactions) {
				const transaction = await this.transactionFactory.fromData(tx);
				yield transaction;
			}

			if (batch.transactions.length === 0) {
				return;
			}
		}
	}
}

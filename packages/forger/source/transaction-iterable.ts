import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { performance } from "perf_hooks";

const MAX_BATCH_BYTES = 10_000_000;
const MAX_BATCH_TRANSACTIONS = 100;

@injectable()
export class TransactionIterable implements AsyncIterable<Contracts.Crypto.Transaction> {
	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#commitKey!: Contracts.Evm.CommitKey;
	#deadline!: number;

	public initialize(commitKey: Contracts.Evm.CommitKey, deadline: number): TransactionIterable {
		this.#commitKey = commitKey;
		this.#deadline = deadline;
		return this;
	}

	public async *[Symbol.asyncIterator](): AsyncIterator<Contracts.Crypto.Transaction> {
		while (true) {
			const batch = await this.#getBatch();

			if (!batch) {
				return;
			}

			for (const tx of batch.transactions) {
				// Pool-sourced txs are already verified by this node's mempool
				const transaction = await this.transactionFactory.fromPoolData(tx);
				yield transaction;
			}

			if (batch.transactions.length === 0) {
				return;
			}
		}
	}

	async #getBatch(): Promise<Contracts.TransactionPool.GetBatchResult | undefined> {
		const timeout = this.#deadline - performance.now();

		if (timeout <= 0) {
			return undefined;
		}

		let timer: NodeJS.Timeout | undefined;

		try {
			const batch = await Promise.race([
				this.txPoolWorker.getTransactions({
					blockRound: `${this.#commitKey.blockNumber}-${this.#commitKey.round}`,
					maxBytes: MAX_BATCH_BYTES,
					maxSize: MAX_BATCH_TRANSACTIONS,
				}),
				new Promise<undefined>((resolve) => {
					timer = setTimeout(() => resolve(undefined), timeout);
				}),
			]);

			if (!batch) {
				this.logger.warn("The transaction pool did not hand over transactions within the block time budget");
			}

			return batch;
		} finally {
			clearTimeout(timer);
		}
	}
}

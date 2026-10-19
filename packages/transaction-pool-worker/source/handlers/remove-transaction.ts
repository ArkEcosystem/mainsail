import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class RemoveTransactionHandler {
	@inject(Identifiers.TransactionPool.Mempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	@inject(Identifiers.TransactionPool.Storage)
	private readonly storage!: Contracts.TransactionPool.Storage;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public async handle(address: string, hash: string): Promise<void> {
		// Removing a transaction also removes the sender's higher-nonce transactions.
		const removedTransactions = await this.mempool.removeTransaction(address, hash);

		const removedTransactionHashes = new Set(removedTransactions.map(({ hash }) => hash));
		removedTransactionHashes.add(hash);

		for (const removedTransactionHash of removedTransactionHashes) {
			this.storage.removeTransaction(removedTransactionHash);
		}

		for (const removedTransaction of removedTransactions) {
			void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, removedTransaction.toData());
		}
	}
}

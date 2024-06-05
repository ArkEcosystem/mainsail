import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetTransactionsHandler {
	@inject(Identifiers.TransactionPool.Service)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.ExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.BlockSerializer;

	public async handle(): Promise<string[]> {
		const milestone = this.configuration.getMilestone();
		let bytesLeft: number = milestone.block.maxPayload - this.blockSerializer.headerSize();

		const candidateTransactions: Contracts.Crypto.Transaction[] = [];
		const failedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const transaction of await this.poolQuery.getFromHighestPriority().all()) {
			if (candidateTransactions.length === milestone.block.maxTransactions) {
				break;
			}

			if (failedTransactions.some((t) => t.data.senderPublicKey === transaction.data.senderPublicKey)) {
				continue;
			}

			try {
				if (await this.expirationService.isExpired(transaction)) {
					const expirationHeight: number = await this.expirationService.getExpirationHeight(transaction);
					throw new Exceptions.TransactionHasExpiredError(transaction, expirationHeight);
				}

				if (bytesLeft - 4 - transaction.serialized.length < 0) {
					break;
				}

				candidateTransactions.push(transaction);

				bytesLeft -= 4;
				bytesLeft -= transaction.serialized.length;
			} catch (error) {
				this.logger.warning(`${transaction.id} failed to collate: ${error.message}`);
				failedTransactions.push(transaction);
			}

			for (const failedTransaction of failedTransactions) {
				await this.pool.removeTransaction(failedTransaction);
			}
		}

		return candidateTransactions.map((transaction) => transaction.serialized.toString("hex"));
	}
}

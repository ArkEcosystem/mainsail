import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class Collator implements Contracts.TransactionPool.Collator {
	@inject(Identifiers.TransactionValidatorFactory)
	private readonly createTransactionValidator!: Contracts.State.TransactionValidatorFactory;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.TransactionPoolService)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPoolExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	public async getBlockCandidateTransactions(): Promise<Contracts.Crypto.ITransaction[]> {
		const height: number = this.stateStore.getLastBlock().data.height;
		const milestone = this.configuration.getMilestone(height);

		let bytesLeft: number = milestone.block.maxPayload - this.blockSerializer.headerSize();

		const candidateTransactions: Contracts.Crypto.ITransaction[] = [];
		const validator: Contracts.State.TransactionValidator = this.createTransactionValidator();
		const failedTransactions: Contracts.Crypto.ITransaction[] = [];

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

				await validator.validate(transaction);
				candidateTransactions.push(transaction);

				bytesLeft -= 4;
				bytesLeft -= transaction.serialized.length;
			} catch (error) {
				this.logger.warning(`${transaction.id} failed to collate: ${error.message}`);
				failedTransactions.push(transaction);
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		(async () => {
			for (const failedTransaction of failedTransactions) {
				await this.pool.removeTransaction(failedTransaction);
			}
		})();

		return candidateTransactions;
	}
}

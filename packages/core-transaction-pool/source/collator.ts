import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionHasExpiredError } from "@arkecosystem/core-contracts";

@injectable()
export class Collator implements Contracts.TransactionPool.Collator {
	@inject(Identifiers.TransactionValidatorFactory)
	private readonly createTransactionValidator!: Contracts.State.TransactionValidatorFactory;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.TransactionPoolService)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPoolExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	public async getBlockCandidateTransactions(): Promise<Crypto.ITransaction[]> {
		const height: number = this.blockchain.getLastBlock().data.height;
		const milestone = this.configuration.getMilestone(height);
		const blockHeaderSize =
			4 + // version
			4 + // timestamp
			4 + // height
			32 + // previousBlockId
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			32 + // payloadHash
			33; // generatorPublicKey

		let bytesLeft: number = milestone.block.maxPayload - blockHeaderSize;

		const candidateTransactions: Crypto.ITransaction[] = [];
		const validator: Contracts.State.TransactionValidator = this.createTransactionValidator();
		const failedTransactions: Crypto.ITransaction[] = [];

		for (const transaction of this.poolQuery.getFromHighestPriority()) {
			if (candidateTransactions.length === milestone.block.maxTransactions) {
				break;
			}

			if (failedTransactions.some((t) => t.data.senderPublicKey === transaction.data.senderPublicKey)) {
				continue;
			}

			try {
				if (await this.expirationService.isExpired(transaction)) {
					const expirationHeight: number = await this.expirationService.getExpirationHeight(transaction);
					throw new TransactionHasExpiredError(transaction, expirationHeight);
				}

				if (bytesLeft - 4 - transaction.serialized.length < 0) {
					break;
				}

				await validator.validate(transaction);
				candidateTransactions.push(transaction);

				bytesLeft -= 4;
				bytesLeft -= transaction.serialized.length;
			} catch (error) {
				this.logger.warning(`${transaction} failed to collate: ${error.message}`);
				failedTransactions.push(transaction);
			}
		}

		(async () => {
			for (const failedTransaction of failedTransactions) {
				await this.pool.removeTransaction(failedTransaction);
			}
		})();

		return candidateTransactions;
	}
}

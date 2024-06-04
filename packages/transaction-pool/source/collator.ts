import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class Collator implements Contracts.TransactionPool.Collator {
	@inject(Identifiers.TransactionPool.TransactionValidator.Factory)
	private readonly createTransactionValidator!: Contracts.State.TransactionValidatorFactory;

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

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Services.Trigger.Service)
	private readonly triggers!: Services.Triggers.Triggers;

	public async getBlockCandidateTransactions(
		commitKey: Contracts.Evm.CommitKey,
	): Promise<Contracts.TransactionPool.CollatorTransaction[]> {
		const milestone = this.configuration.getMilestone();

		let bytesLeft: number = milestone.block.maxPayload - this.blockSerializer.headerSize();
		let gasLeft: number = milestone.block.maxGasLimit;

		// TODO: which wallet repo to use here?
		const walletRepository = this.stateService.getStore().walletRepository;

		const candidateTransactions: Contracts.TransactionPool.CollatorTransaction[] = [];
		const validator: Contracts.State.TransactionValidator = this.createTransactionValidator();
		const failedTransactions: Contracts.Crypto.Transaction[] = [];

		let sequence = 0;
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

				const gasUsed = (await this.triggers.call<number>("calculateTransactionGasUsage", {
					commitKey,
					sequence,
					transaction,
					walletRepository,
				})) as number;

				if (gasLeft - gasUsed < 0) {
					break;
				}

				gasLeft -= gasUsed;

				candidateTransactions.push({ ...transaction, gasUsed });

				bytesLeft -= 4;
				bytesLeft -= transaction.serialized.length;

				sequence++;
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

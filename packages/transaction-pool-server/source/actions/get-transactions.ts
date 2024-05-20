import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetTransactionsAction implements Contracts.Api.RPC.Action {
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

	public readonly name: string = "get_transactions";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		const milestone = this.configuration.getMilestone();
		let bytesLeft = milestone.block.maxPayload;

		const candidateTransactions: Contracts.Crypto.Transaction[] = [];
		const failedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const transaction of await this.poolQuery.getFromHighestPriority().all()) {
			if (candidateTransactions.length === milestone.block.maxTransactions) {
				break;
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

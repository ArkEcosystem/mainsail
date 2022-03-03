import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class ProcessorExtension extends Contracts.TransactionPool.ProcessorExtension {
	@inject(Identifiers.Fee.Matcher)
	private readonly feeMatcher!: Contracts.TransactionPool.FeeMatcher;

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.feeMatcher.throwIfCannotBroadcast(transaction);
	}
}

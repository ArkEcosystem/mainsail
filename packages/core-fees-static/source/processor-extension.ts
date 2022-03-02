import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

@Container.injectable()
export class ProcessorExtension extends Contracts.TransactionPool.ProcessorExtension {
	@Container.inject(Identifiers.Fee.Matcher)
	private readonly feeMatcher!: Contracts.TransactionPool.FeeMatcher;

	public async throwIfCannotBroadcast(transaction: Crypto.ITransaction): Promise<void> {
		await this.feeMatcher.throwIfCannotBroadcast(transaction);
	}
}

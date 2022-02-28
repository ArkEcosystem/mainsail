import { ITransaction } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts } from "@arkecosystem/core-kernel";

@Container.injectable()
export class ProcessorExtension extends Contracts.TransactionPool.ProcessorExtension {
	@Container.inject(Container.Identifiers.Fee.Matcher)
	private readonly feeMatcher!: Contracts.TransactionPool.FeeMatcher;

	public async throwIfCannotBroadcast(transaction: ITransaction): Promise<void> {
		await this.feeMatcher.throwIfCannotBroadcast(transaction);
	}
}

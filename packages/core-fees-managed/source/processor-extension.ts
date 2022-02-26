import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

@Container.injectable()
export class ProcessorExtension extends Contracts.TransactionPool.ProcessorExtension {
	@Container.inject(Container.Identifiers.Fee.Matcher)
	private readonly feeMatcher!: Contracts.TransactionPool.FeeMatcher;

	public async throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void> {
		await this.feeMatcher.throwIfCannotBroadcast(transaction);
	}
}

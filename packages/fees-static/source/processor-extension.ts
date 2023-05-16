import { Contracts } from "@mainsail/contracts";

@injectable()
export class ProcessorExtension implements Contracts.TransactionPool.ProcessorExtension {
	@inject(Identifiers.Fee.Matcher)
	private readonly feeMatcher!: Contracts.TransactionPool.FeeMatcher;

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.feeMatcher.throwIfCannotBroadcast(transaction);
	}
}

import { Container } from "@arkecosystem/core-container";
import { BINDINGS, TransactionServiceProvider as Contract } from "@arkecosystem/core-crypto-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";

import { One } from "./versions/1";
import { Two } from "./versions/2";

export * from "./builder";

@Container.injectable()
export class TransactionServiceProvider implements Contract {
	@Container.inject(BINDINGS.Transaction.Registry)
	private readonly registry: TransactionRegistry;

	public async register(): Promise<void> {
		this.registry.registerTransactionType(One);
		this.registry.registerTransactionType(Two);
	}
}

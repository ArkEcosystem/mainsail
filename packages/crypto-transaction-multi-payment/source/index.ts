import { Container } from "@arkecosystem/container";
import { BINDINGS, TransactionServiceProvider as Contract } from "@arkecosystem/crypto-contracts";
import { TransactionRegistry } from "@arkecosystem/crypto-transaction";

import { Two } from "./versions/2";

export * from "./builder";

@Container.injectable()
export class TransactionServiceProvider implements Contract {
	@Container.inject(BINDINGS.Transaction.Registry)
	private readonly registry: TransactionRegistry;

	public async register(): Promise<void> {
		this.registry.registerTransactionType(Two);
	}
}

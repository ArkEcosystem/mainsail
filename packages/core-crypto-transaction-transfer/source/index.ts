import { Container } from "@arkecosystem/core-container";
import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";

import { TransferTransaction } from "./versions/1";

export * from "./builder";
export * from "./versions";

@Container.injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const registry: TransactionRegistry = this.app.get(BINDINGS.Transaction.Registry);

		registry.registerTransactionType(TransferTransaction);
	}
}

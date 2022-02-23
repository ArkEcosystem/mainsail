import { Container } from "@arkecosystem/core-container";
import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";

import { Two } from "./versions/2";

export * from "./builder";

@Container.injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const registry: TransactionRegistry = this.app.get(BINDINGS.Transaction.Registry);

		registry.registerTransactionType(Two);
	}
}

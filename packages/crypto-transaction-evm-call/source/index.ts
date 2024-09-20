import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";

import { EvmCallTransactionHandler } from "./handlers/index.js";
import { EvmCallTransaction } from "./versions/1.js";

export * from "./builder.js";
export * from "./versions/index.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerType();

		this.#registerHandler();
	}

	public requiredByWorker(): boolean {
		return true;
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(EvmCallTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.Transaction.Handler.Instances).to(EvmCallTransactionHandler);
	}
}

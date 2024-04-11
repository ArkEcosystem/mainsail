import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { TransferTransactionHandler } from "./handlers/index.js";
import { TransferTransaction } from "./versions/index.js";

export * from "./builder.js";
export * from "./versions/index.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	public requiredByWorker(): boolean {
		return true;
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry).set(
			TransferTransaction.key,
			{
				managed: BigNumber.make("100"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
			TransferTransaction.version,
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(TransferTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.Transaction.Handler.Instances).to(TransferTransactionHandler);
	}
}

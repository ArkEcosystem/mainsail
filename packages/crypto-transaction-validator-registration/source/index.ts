import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { ValidatorRegistrationTransactionHandler } from "./handlers";
import { ValidatorRegistrationTransaction } from "./versions/1";

export * from "./builder";
export * from "./handlers";
export * from "./versions";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	public requiredByWorker(): boolean { return true }

	#registerFees(): void {
		this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry).set(
			ValidatorRegistrationTransaction.key,
			ValidatorRegistrationTransaction.version,
			{
				managed: BigNumber.make("400000"),
				static: BigNumber.make("2500000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)]!,
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(ValidatorRegistrationTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.Transaction.Handler.Instances).to(ValidatorRegistrationTransactionHandler);
	}
}

import { injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { ValidatorRegistrationTransactionHandler } from "./handlers";
import { schemas } from "./validation/schemas";
import { ValidatorRegistrationTransaction } from "./versions/1";

export * from "./builder";
export * from "./handlers";
export * from "./versions";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerSchemas();

		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.IFeeRegistry>(Identifiers.Fee.Registry).set(
			ValidatorRegistrationTransaction.key,
			ValidatorRegistrationTransaction.version,
			{
				managed: BigNumber.make("400000"),
				static: BigNumber.make("2500000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(ValidatorRegistrationTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.TransactionHandler).to(ValidatorRegistrationTransactionHandler);
	}
}

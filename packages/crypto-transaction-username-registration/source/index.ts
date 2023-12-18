import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { UsernameRegistrationTransactionHandler } from "./handlers";
import { schemas } from "./validation/schemas";
import { UsernameRegistrationTransaction } from "./versions/1";

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
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry).set(
			UsernameRegistrationTransaction.key,
			UsernameRegistrationTransaction.version,
			{
				managed: BigNumber.make("400000"),
				static: BigNumber.make("2500000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)]!,
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(UsernameRegistrationTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.TransactionHandler).to(UsernameRegistrationTransactionHandler);
	}
}

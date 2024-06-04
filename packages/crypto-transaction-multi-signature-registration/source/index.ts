import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { MultiSignatureRegistrationTransactionHandler } from "./handlers/index.js";
import { MultiSignatureRegistrationTransaction } from "./versions/1.js";

export * from "./builder.js";
export * from "./versions/index.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry).set(
			MultiSignatureRegistrationTransaction.key,
			{
				managed: BigNumber.make("500"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
			MultiSignatureRegistrationTransaction.version,
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(MultiSignatureRegistrationTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.Transaction.Handler.Instances).to(MultiSignatureRegistrationTransactionHandler);
	}
}

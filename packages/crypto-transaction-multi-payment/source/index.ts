import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { MultiPaymentTransactionHandler } from "./handlers";
import { makeKeywords } from "./validation";
import { MultiPaymentTransaction } from "./versions/1";

export * from "./builder";
export * from "./versions";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerKeywords();

		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	#registerKeywords(): void {
		for (const keyword of Object.values(
			makeKeywords(this.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)),
		)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.IFeeRegistry>(Identifiers.Fee.Registry).set(
			MultiPaymentTransaction.key,
			MultiPaymentTransaction.version,
			{
				managed: BigNumber.make("500"),
				static: BigNumber.make("10000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(MultiPaymentTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.TransactionHandler).to(MultiPaymentTransactionHandler);
	}
}

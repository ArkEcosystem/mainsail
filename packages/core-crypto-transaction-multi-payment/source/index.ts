import { injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

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

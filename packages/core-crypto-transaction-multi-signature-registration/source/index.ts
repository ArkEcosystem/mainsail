import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { MultiSignatureRegistrationTransactionHandler } from "./handlers";
import { MultiSignatureRegistrationTransaction } from "./versions/1";

export * from "./builder";
export * from "./versions";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.IFeeRegistry>(Identifiers.Fee.Registry).set(
			MultiSignatureRegistrationTransaction.key,
			MultiSignatureRegistrationTransaction.version,
			{
				managed: BigNumber.make("500"),
				static: BigNumber.make("500000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(MultiSignatureRegistrationTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.TransactionHandler).to(MultiSignatureRegistrationTransactionHandler);
	}
}

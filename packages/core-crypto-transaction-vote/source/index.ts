import { injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionRegistry } from "@arkecosystem/core-crypto-transaction";
import { Providers } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { VoteTransactionHandler } from "./handlers";
import { makeKeywords } from "./validation";
import { VoteTransaction } from "./versions/1";

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
		for (const keyword of Object.values(makeKeywords())) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.IFeeRegistry>(Identifiers.Fee.Registry).set(
			VoteTransaction.key,
			VoteTransaction.version,
			{
				managed: BigNumber.make("100"),
				static: BigNumber.make("100000000"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(VoteTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.TransactionHandler).to(VoteTransactionHandler);
	}
}

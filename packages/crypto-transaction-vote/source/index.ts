import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionRegistry } from "@mainsail/crypto-transaction";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { VoteTransactionHandler } from "./handlers/index.js";
import { makeKeywords } from "./validation/index.js";
import { VoteTransaction } from "./versions/1.js";

export * from "./builder.js";
export * from "./versions/index.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerKeywords();

		this.#registerFees();

		this.#registerType();

		this.#registerHandler();
	}

	public requiredByWorker(): boolean {
		return true;
	}

	#registerKeywords(): void {
		for (const keyword of Object.values(makeKeywords())) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}
	}

	#registerFees(): void {
		this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry).set(
			VoteTransaction.key,
			{
				managed: BigNumber.make("100"),
			}[this.app.get<string>(Identifiers.Fee.Type)],
			VoteTransaction.version,
		);
	}

	#registerType(): void {
		this.app
			.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
			.registerTransactionType(VoteTransaction);
	}

	#registerHandler(): void {
		this.app.bind(Identifiers.Transaction.Handler.Instances).to(VoteTransactionHandler);
	}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class TransactionHandler implements Contracts.Transactions.TransactionHandler {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	public async verify(transaction: Contracts.Crypto.Transaction): Promise<boolean> {
		return this.verifier.verifyHash(transaction);
	}
}

export type TransactionHandlerConstructor = new () => TransactionHandler;

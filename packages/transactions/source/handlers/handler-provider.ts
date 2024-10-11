import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";

import { TransactionHandlerConstructor } from "./transaction.js";

@injectable()
export class TransactionHandlerProvider implements Contracts.Transactions.TransactionHandlerProvider {
	@inject(Identifiers.Transaction.Handler.Constructors)
	private readonly handlerConstructors!: TransactionHandlerConstructor[];

	#registered = false;
	#handlerDependencyLookup = new Set<TransactionConstructor>();

	public isRegistrationRequired(): boolean {
		return this.#registered === false;
	}

	public registerHandlers(): void {
		for (const handlerConstructor of this.handlerConstructors) {
			this.#registerHandler(handlerConstructor);
		}

		this.#registered = true;
	}

	#registerHandler(handlerConstructor: TransactionHandlerConstructor) {
		const handler = new handlerConstructor();
		const transactionConstructor = handler.getConstructor();

		this.#handlerDependencyLookup.add(transactionConstructor);
	}
}

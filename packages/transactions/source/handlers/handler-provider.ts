import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";

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

		Utils.assert.defined<number>(transactionConstructor.type);

		if (
			this.#hasOtherHandlerHandling(
				handlerConstructor,
				transactionConstructor.type,
				transactionConstructor.version,
			)
		) {
			throw new Exceptions.AlreadyRegisteredError(transactionConstructor.type);
		}

		for (const dependency of handler.dependencies()) {
			if (this.#hasOtherHandler(dependency) === false) {
				throw new Exceptions.UnsatisfiedDependencyError(transactionConstructor.type);
			}
		}
	}

	#hasOtherHandlerHandling(handlerConstructor: TransactionHandlerConstructor, internalType: number, version: number) {
		for (const otherHandlerConstructor of this.handlerConstructors) {
			if (otherHandlerConstructor === handlerConstructor) {
				continue;
			}

			const otherHandler = new otherHandlerConstructor();
			const otherTransactionConstructor = otherHandler.getConstructor();

			Utils.assert.defined<number>(otherTransactionConstructor.type);

			if (otherTransactionConstructor.type === internalType && otherTransactionConstructor.version === version) {
				return true;
			}
		}

		return false;
	}

	#hasOtherHandler(dependencyConstructor: TransactionHandlerConstructor) {
		const dependency = new dependencyConstructor().getConstructor();

		return [...this.#handlerDependencyLookup].some((handler) => handler.type === dependency.type);
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { InternalTransactionType, TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";

import { TransactionHandlerConstructor } from "./transaction.js";

@injectable()
export class TransactionHandlerProvider implements Contracts.Transactions.TransactionHandlerProvider {
	@inject(Identifiers.State.Wallet.Attributes)
	private readonly attributeRepository!: Contracts.State.AttributeRepository;

	@inject(Identifiers.Transaction.Handler.Constructors)
	private readonly handlerConstructors!: TransactionHandlerConstructor[];

	@inject(Identifiers.Cryptography.Transaction.Registry)
	private readonly transactionRegistry!: Contracts.Crypto.TransactionRegistry;

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
		Utils.assert.defined<number>(transactionConstructor.typeGroup);

		const internalType = InternalTransactionType.from(
			transactionConstructor.type,
			transactionConstructor.typeGroup,
		);

		if (this.#hasOtherHandlerHandling(handlerConstructor, internalType, transactionConstructor.version)) {
			throw new Exceptions.AlreadyRegisteredError(internalType);
		}

		for (const dependency of handler.dependencies()) {
			if (this.#hasOtherHandler(dependency) === false) {
				throw new Exceptions.UnsatisfiedDependencyError(internalType);
			}
		}

		for (const attribute of handler.walletAttributes()) {
			if (!this.attributeRepository.has(attribute.name)) {
				this.attributeRepository.set(attribute.name, attribute.type);
			}
		}

		if (transactionConstructor.typeGroup !== Contracts.Crypto.TransactionTypeGroup.Core) {
			this.transactionRegistry.registerTransactionType(transactionConstructor);
		}
	}

	#hasOtherHandlerHandling(
		handlerConstructor: TransactionHandlerConstructor,
		internalType: Contracts.Transactions.InternalTransactionType,
		version: number,
	) {
		for (const otherHandlerConstructor of this.handlerConstructors) {
			if (otherHandlerConstructor === handlerConstructor) {
				continue;
			}

			const otherHandler = new otherHandlerConstructor();
			const otherTransactionConstructor = otherHandler.getConstructor();

			Utils.assert.defined<number>(otherTransactionConstructor.type);
			Utils.assert.defined<number>(otherTransactionConstructor.typeGroup);

			const otherInternalType = InternalTransactionType.from(
				otherTransactionConstructor.type,
				otherTransactionConstructor.typeGroup,
			);

			if (otherInternalType === internalType && otherTransactionConstructor.version === version) {
				return true;
			}
		}

		return false;
	}

	#hasOtherHandler(dependencyConstructor: TransactionHandlerConstructor) {
		const dependency = new dependencyConstructor().getConstructor();

		return [...this.#handlerDependencyLookup].some(
			(handler) =>
				handler.type === dependency.type &&
				handler.typeGroup === dependency.typeGroup &&
				handler.version === dependency.version,
		);
	}
}

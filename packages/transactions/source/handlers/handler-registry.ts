import { inject, injectable, multiInject, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { TransactionHandlerProvider } from "./handler-provider.js";
import { TransactionHandler } from "./transaction.js";

@injectable()
export class TransactionHandlerRegistry implements Contracts.Transactions.TransactionHandlerRegistry {
	@inject(Identifiers.Transaction.Handler.Provider)
	private readonly provider!: TransactionHandlerProvider;

	@multiInject(Identifiers.Transaction.Handler.Instances)
	private readonly handlers!: TransactionHandler[];

	@postConstruct()
	public initialize(): void {
		if (this.provider.isRegistrationRequired()) {
			this.provider.registerHandlers();
		}
	}

	public getRegisteredHandlers(): TransactionHandler[] {
		return this.handlers;
	}

	public getRegisteredHandlerByType(internalType: number, version = 0): TransactionHandler {
		for (const handler of this.handlers) {
			const transactionConstructor = handler.getConstructor();
			Utils.assert.defined<number>(transactionConstructor.type);
			if (transactionConstructor.type === internalType) {
				return handler;
			}
		}

		throw new Exceptions.InvalidTransactionTypeError(internalType);
	}

	public async getActivatedHandlers(): Promise<TransactionHandler[]> {
		const promises = this.handlers.map(
			async (handler): Promise<[TransactionHandler, boolean]> => [handler, await handler.isActivated()],
		);
		const results = await Promise.all(promises);
		const activated = results.filter(([_, activated]) => activated);
		return activated.map(([handler, _]) => handler);
	}

	public async getActivatedHandlerByType(internalType: number, version = 0): Promise<TransactionHandler> {
		const handler = this.getRegisteredHandlerByType(internalType, version);
		if (await handler.isActivated()) {
			return handler;
		}
		throw new Exceptions.DeactivatedTransactionHandlerError(internalType);
	}

	public async getActivatedHandlerForData(
		transactionData: Contracts.Crypto.TransactionData,
	): Promise<TransactionHandler> {
		return this.getActivatedHandlerByType(transactionData.type, 0);
	}
}

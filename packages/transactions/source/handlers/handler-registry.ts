import { Contracts, Exceptions } from "@mainsail/contracts";
import { InternalTransactionType } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";

import { TransactionHandlerProvider } from "./handler-provider";
import { TransactionHandler } from "./transaction";

@injectable()
export class TransactionHandlerRegistry implements Contracts.Transactions.ITransactionHandlerRegistry {
	@inject(Identifiers.TransactionHandlerProvider)
	private readonly provider!: TransactionHandlerProvider;

	@multiInject(Identifiers.TransactionHandler)
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

	public getRegisteredHandlerByType(
		internalType: Contracts.Transactions.IInternalTransactionType,
		version = 1,
	): TransactionHandler {
		for (const handler of this.handlers) {
			const transactionConstructor = handler.getConstructor();
			Utils.assert.defined<number>(transactionConstructor.type);
			Utils.assert.defined<number>(transactionConstructor.typeGroup);
			const handlerInternalType = InternalTransactionType.from(
				transactionConstructor.type,
				transactionConstructor.typeGroup,
			);
			if (handlerInternalType === internalType && transactionConstructor.version === version) {
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

	public async getActivatedHandlerByType(
		internalType: Contracts.Transactions.IInternalTransactionType,
		version = 1,
	): Promise<TransactionHandler> {
		const handler = this.getRegisteredHandlerByType(internalType, version);
		if (await handler.isActivated()) {
			return handler;
		}
		throw new Exceptions.DeactivatedTransactionHandlerError(internalType);
	}

	public async getActivatedHandlerForData(
		transactionData: Contracts.Crypto.ITransactionData,
	): Promise<TransactionHandler> {
		const internalType = InternalTransactionType.from(transactionData.type, transactionData.typeGroup);
		return this.getActivatedHandlerByType(internalType, transactionData.version);
	}
}

import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/core-kernel";

export class ThrowIfCannotEnterPoolAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.ITransaction = arguments_.transaction;

		return handler.throwIfCannotEnterPool(transaction);
	}
}

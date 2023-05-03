import { Contracts } from "@mainsail/core-contracts";
import { Services, Types } from "@mainsail/core-kernel";

export class RevertTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.ITransaction = arguments_.transaction;

		return handler.revert(transaction);
	}
}

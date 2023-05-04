import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class VerifyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.ITransaction = arguments_.transaction;

		return handler.verify(transaction);
	}
}

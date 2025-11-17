import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class VerifyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Contracts.Kernel.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;

		return handler.verify(transaction);
	}
}

import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class VerifyTransactionAction extends Services.Triggers.Action {
	public async execute(
		arguments_: Contracts.Kernel.ActionArguments<{
			handler: Contracts.Transactions.TransactionHandler;
			transaction: Contracts.Crypto.Transaction;
		}>,
	): Promise<boolean> {
		const handler = arguments_.handler;
		const transaction = arguments_.transaction;

		return handler.verify(transaction);
	}
}

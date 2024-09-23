import { Contracts } from "@mainsail/contracts";
import { Types } from "@mainsail/kernel";

import { TransactionTriggerAction } from "./transaction-trigger-action.js";

export class ApplyTransactionAction extends TransactionTriggerAction {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;

		await handler.apply(
			{
				evm: this.mockEvmContext(),
			},
			transaction,
		);
	}
}

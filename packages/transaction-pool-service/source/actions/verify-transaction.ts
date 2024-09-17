import { Contracts } from "@mainsail/contracts";
import { Types } from "@mainsail/kernel";

import { TransactionTriggerAction } from "./transaction-trigger-action.js";

export class VerifyTransactionAction extends TransactionTriggerAction {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const walletRepository: Contracts.State.WalletRepository = arguments_.walletRepository;

		return handler.verify(
			{
				evm: this.mockEvmContext(),
				walletRepository,
			},
			transaction,
		);
	}
}

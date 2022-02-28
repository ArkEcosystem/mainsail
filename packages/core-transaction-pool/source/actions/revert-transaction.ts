import Interfaces from "@arkecosystem/core-crypto-contracts";
import { Contracts, Services, Types } from "@arkecosystem/core-kernel";

export class RevertTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Interfaces.ITransaction = arguments_.transaction;

		return handler.revert(transaction);
	}
}

import Contracts, { Crypto } from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

export class ApplyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Crypto.ITransaction = arguments_.transaction;

		return handler.apply(transaction);
	}
}

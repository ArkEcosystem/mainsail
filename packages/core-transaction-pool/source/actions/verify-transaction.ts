import Contracts, { Crypto } from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

export class VerifyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.ITransactionHandler = arguments_.handler;
		const transaction: Crypto.ITransaction = arguments_.transaction;

		return handler.verify(transaction);
	}
}

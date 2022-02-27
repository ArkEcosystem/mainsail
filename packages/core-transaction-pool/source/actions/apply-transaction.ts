import Interfaces from "@arkecosystem/core-crypto-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";

export class ApplyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Handlers.TransactionHandler = arguments_.handler;
		const transaction: Interfaces.ITransaction = arguments_.transaction;

		return handler.apply(transaction);
	}
}

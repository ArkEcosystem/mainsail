import { Contracts } from "@mainsail/contracts";
import { Services,Types  } from "@mainsail/kernel";


export class ThrowIfCannotBeAppliedAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const sender: Contracts.State.Wallet = arguments_.sender;

		await handler.throwIfCannotBeApplied(
			transaction,
			sender
		);
	}
}

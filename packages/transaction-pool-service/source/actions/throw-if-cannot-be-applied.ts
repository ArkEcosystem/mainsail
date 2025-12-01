import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class ThrowIfCannotBeAppliedAction extends Services.Triggers.Action {
	public async execute(
		arguments_: Contracts.Kernel.ActionArguments<{
			handler: Contracts.Transactions.TransactionHandler;
			transaction: Contracts.Crypto.Transaction;
			sender: Contracts.State.Wallet;
			evm: Contracts.Evm.Instance;
		}>,
	): Promise<void> {
		const handler = arguments_.handler;
		const transaction = arguments_.transaction;
		const sender = arguments_.sender;
		const evm = arguments_.evm;

		await handler.throwIfCannotBeApplied(transaction, sender, evm);
	}
}

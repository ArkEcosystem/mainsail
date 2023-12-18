import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class VerifyTransactionAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const walletRepository: Contracts.State.WalletRepository = arguments_.walletRepository;

		return handler.verify(walletRepository, transaction);
	}
}

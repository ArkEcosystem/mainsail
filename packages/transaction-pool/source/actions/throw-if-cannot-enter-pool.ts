import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class ThrowIfCannotEnterPoolAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const walletRepository: Contracts.State.WalletRepository = arguments_.walletRepository;

		return handler.throwIfCannotEnterPool(walletRepository, transaction);
	}
}

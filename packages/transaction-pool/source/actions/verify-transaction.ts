import { inject, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class VerifyTransactionAction extends Services.Triggers.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "mock")
	private readonly evm!: Contracts.Evm.Instance;

	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const handler: Contracts.Transactions.TransactionHandler = arguments_.handler;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const walletRepository: Contracts.State.WalletRepository = arguments_.walletRepository;

		return handler.verify({ evm: this.evm, walletRepository }, transaction);
	}
}

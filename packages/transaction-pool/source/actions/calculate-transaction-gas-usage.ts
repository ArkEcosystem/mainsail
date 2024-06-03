import { inject, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types, Utils } from "@mainsail/kernel";

export class CalculateTransactionGasUsage extends Services.Triggers.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Evm.Gas.Limits)
	private readonly gasLimits!: Contracts.Evm.GasLimits;

	public async execute(arguments_: Types.ActionArguments): Promise<number> {
		const commitKey: Contracts.Evm.CommitKey = arguments_.commitKey;
		const transaction: Contracts.Crypto.Transaction = arguments_.transaction;
		const walletRepository: Contracts.State.WalletRepository = arguments_.walletRepository;

		let gasUsed: number;

		switch (transaction.type) {
			case Contracts.Crypto.TransactionType.EvmCall: {
				Utils.assert.defined(transaction.data.asset?.evmCall);
				const { evmCall } = transaction.data.asset;
				const sender = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

				const { receipt } = await this.evm.process({
					commitKey,
					caller: sender.getAddress(),
					recipient: transaction.data.recipientId,
					data: Buffer.from(evmCall.payload, "hex"),
					gasLimit: BigInt(evmCall.gasLimit),
				});

				gasUsed = Number(receipt.gasUsed);
				// TODO: calculate fee as well
				break;
			}
			default: {
				gasUsed = this.gasLimits.of(transaction);
				break;
			}
		}

		return gasUsed;
	}
}

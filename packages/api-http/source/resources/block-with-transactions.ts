import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { Resource } from "../types";

type BlockDataWithTransactionData = {
	data: Contracts.Crypto.IBlockData;
	transactions: Contracts.Crypto.ITransactionData[];
};

// TODO: delete in favour of BlockResource

@injectable()
export class BlockWithTransactionsResource implements Resource {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public raw(resource: BlockDataWithTransactionData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(resource: BlockDataWithTransactionData): Promise<object> {
		const blockData: Contracts.Crypto.IBlockData = resource.data;
		// const blockTransactions: Interfaces.ITransactionData[] = resource.transactions;

		// const totalMultiPaymentTransferred: Utils.BigNumber = blockTransactions
		// 	.filter((t) => t.typeGroup === Enums.TransactionTypeGroup.Core)
		// 	.filter((t) => t.type === Enums.TransactionType.MultiPayment)
		// 	.flatMap((t) => t.asset!.payments)
		// 	.reduce((sum, payment) => sum.plus(payment.amount), Utils.BigNumber.ZERO);

		// const totalAmountTransferred: Utils.BigNumber = blockData.totalAmount.plus(totalMultiPaymentTransferred);
		const totalAmountTransferred: BigNumber = blockData.totalAmount;
		const generator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			blockData.generatorPublicKey,
		);
		const lastBlock: Contracts.Crypto.IBlock = this.stateStore.getLastBlock();

		return {
			confirmations: lastBlock ? lastBlock.data.height - blockData.height : 0,
			forged: {
				amount: totalAmountTransferred.toFixed(),
				fee: blockData.totalFee.toFixed(),
				reward: blockData.reward.toFixed(),
				total: blockData.reward.plus(blockData.totalFee).toFixed(),
			},
			generator: {
				address: generator.getAddress(),
				publicKey: generator.getPublicKey(),
				username: generator.hasAttribute("validatorUsername")
					? generator.getAttribute("validatorUsername")
					: undefined,
			},
			height: +blockData.height,
			id: blockData.id,
			payload: {
				hash: blockData.payloadHash,
				length: blockData.payloadLength,
			},
			previous: blockData.previousBlock,
			transactions: blockData.numberOfTransactions,
			version: +blockData.version,
			// timestamp: AppUtils.formatTimestamp(blockData.timestamp),
		};
	}
}

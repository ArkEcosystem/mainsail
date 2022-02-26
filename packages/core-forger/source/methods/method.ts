import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Blocks, Crypto, Utils } from "@arkecosystem/crypto";
import Interfaces from "@arkecosystem/core-crypto-contracts";

export abstract class Method {
	protected createBlock(
		keys: Interfaces.IKeyPair,
		transactions: Interfaces.ITransactionData[],
		options: Record<string, any>,
	): Interfaces.IBlock {
		const totals: { amount: Utils.BigNumber; fee: Utils.BigNumber } = {
			amount: Utils.BigNumber.ZERO,
			fee: Utils.BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];
		for (const transaction of transactions) {
			AppUtils.assert.defined<string>(transaction.id);

			totals.amount = totals.amount.plus(transaction.amount);
			totals.fee = totals.fee.plus(transaction.fee);

			payloadBuffers.push(Buffer.from(transaction.id, "hex"));
		}

		return Blocks.BlockFactory.make(
			{
				generatorPublicKey: keys.publicKey,
				height: options.previousBlock.height + 1,
				numberOfTransactions: transactions.length,
				payloadHash: Crypto.HashAlgorithms.sha256(payloadBuffers).toString("hex"),
				payloadLength: 32 * transactions.length,
				previousBlock: options.previousBlock.id,
				previousBlockHex: options.previousBlock.idHex,
				reward: options.reward,
				timestamp: options.timestamp,
				totalAmount: totals.amount,
				version: 0,
				totalFee: totals.fee,
				transactions,
			},
			keys,
		)!; // todo: this method should never return undefined
	}
}

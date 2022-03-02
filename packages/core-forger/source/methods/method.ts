import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

@Container.injectable()
export abstract class Method {
	@Container.inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Crypto.IBlockFactory;

	@Container.inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Crypto.IHashFactory;

	protected async createBlock(
		keys: Crypto.IKeyPair,
		transactions: Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Crypto.IBlock> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];
		for (const transaction of transactions) {
			AppUtils.assert.defined<string>(transaction.id);

			totals.amount = totals.amount.plus(transaction.amount);
			totals.fee = totals.fee.plus(transaction.fee);

			payloadBuffers.push(Buffer.from(transaction.id, "hex"));
		}

		return this.blockFactory.make(
			{
				generatorPublicKey: keys.publicKey,
				height: options.previousBlock.height + 1,
				numberOfTransactions: transactions.length,
				payloadHash: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
				payloadLength: 32 * transactions.length,
				previousBlock: options.previousBlock.id,
				previousBlockHex: options.previousBlock.idHex,
				reward: options.reward,
				timestamp: options.timestamp,
				totalAmount: totals.amount,
				totalFee: totals.fee,
				transactions,
				version: 0,
			},
			keys,
		)!; // todo: this method should never return undefined
	}
}

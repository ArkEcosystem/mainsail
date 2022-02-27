import { Container, Utils as AppUtils } from "@arkecosystem/core-kernel";
import Interfaces, { BINDINGS, IBlockFactory, IHashFactory } from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";

@Container.injectable()
export abstract class Method {
	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly blockFactory: IBlockFactory;

	@Container.inject(BINDINGS.HashFactory)
	private readonly hashFactory: IHashFactory;

	protected async createBlock(
		keys: Interfaces.IKeyPair,
		transactions: Interfaces.ITransactionData[],
		options: Record<string, any>,
	): Promise<Interfaces.IBlock> {
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
				version: 0,
				totalFee: totals.fee,
				transactions,
			},
			keys,
		)!; // todo: this method should never return undefined
	}
}

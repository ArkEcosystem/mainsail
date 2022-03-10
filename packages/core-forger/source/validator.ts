import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class Validator implements Contracts.Forger.Validator {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	#mnemonic: string;

	public keys: Contracts.Crypto.IKeyPair | undefined;

	public publicKey: string;

	public address: string;

	public async configure(mnemonic: string): Promise<Validator> {
		this.#mnemonic = mnemonic;
		this.keys = await this.keyPairFactory.fromMnemonic(this.#mnemonic);
		this.publicKey = this.keys.publicKey;
		this.address = await this.addressFactory.fromPublicKey(this.publicKey);

		return this;
	}

	public async forge(
		transactions: Contracts.Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Contracts.Crypto.IBlock> {
		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};

		const payloadBuffers: Buffer[] = [];
		for (const transaction of transactions) {
			Utils.assert.defined<string>(transaction.id);

			totals.amount = totals.amount.plus(transaction.amount);
			totals.fee = totals.fee.plus(transaction.fee);

			payloadBuffers.push(Buffer.from(transaction.id, "hex"));
		}

		return this.blockFactory.make(
			{
				generatorPublicKey: this.keys.publicKey,
				height: options.previousBlock.height + 1,
				numberOfTransactions: transactions.length,
				payloadHash: (await this.hashFactory.sha256(payloadBuffers)).toString("hex"),
				payloadLength: 32 * transactions.length,
				previousBlock: options.previousBlock.id,
				reward: options.reward,
				timestamp: options.timestamp,
				totalAmount: totals.amount,
				totalFee: totals.fee,
				transactions,
				version: 1,
			},
			this.keys,
		);
	}
}

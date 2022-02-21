import { HashFactory } from "@arkecosystem/crypto-hash-bcrypto";
import { Signatory } from "@arkecosystem/crypto-signature-ecdsa";
import { IBlock, IBlockData, IBlockJson, IKeyPair, ITransaction } from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Block } from "./block";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import { Configuration } from "@arkecosystem/crypto-config";

export class BlockFactory {
	readonly #configuration: Configuration;

	public constructor(configuration: Configuration) {
		this.#configuration = configuration;
	}

	// @todo: add a proper type hint for data
	public async make(data: any, keys: IKeyPair): Promise<IBlock | undefined> {
		data.generatorPublicKey = keys.publicKey;

		const payloadHash: Buffer = new Serializer(this.#configuration).serialize(data, false);
		const hash: Buffer = await new HashFactory().sha256(payloadHash);

		data.blockSignature = await new Signatory().sign(hash, Buffer.from(keys.privateKey, "hex"));
		// @ts-ignore
		data.id = new Block(this.#configuration, {}).getId(data);

		return this.fromData(data);
	}

	public fromHex(hex: string): IBlock {
		return this.fromSerialized(Buffer.from(hex, "hex"));
	}

	public fromBytes(buff: Buffer): IBlock {
		return this.fromSerialized(buff);
	}

	public fromJson(json: IBlockJson): IBlock | undefined {
		// @ts-ignore
		const data: IBlockData = { ...json };
		data.totalAmount = BigNumber.make(data.totalAmount);
		data.totalFee = BigNumber.make(data.totalFee);
		data.reward = BigNumber.make(data.reward);

		if (data.transactions) {
			for (const transaction of data.transactions) {
				transaction.amount = BigNumber.make(transaction.amount);
				transaction.fee = BigNumber.make(transaction.fee);
			}
		}

		return this.fromData(data);
	}

	public fromData(
		data: IBlockData,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): IBlock | undefined {
		// @ts-ignore
		const block: IBlockData | undefined = new Block(this.#configuration, {}).applySchema(data);

		if (block) {
			const serialized: Buffer = new Serializer(this.#configuration).serializeWithTransactions(data);
			const block: IBlock = new Block(this.#configuration, {
				...new Deserializer(this.#configuration).deserialize(serialized, false, options),
				id: data.id,
			});
			block.serialized = serialized.toString("hex");

			return block;
		}

		return undefined;
	}

	private fromSerialized(serialized: Buffer): IBlock {
		const deserialized: { data: IBlockData; transactions: ITransaction[] } = new Deserializer(
			this.#configuration,
		).deserialize(serialized);

		// @ts-ignore
		const validated: IBlockData | undefined = new Block(this.#configuration, {}).applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		const block: IBlock = new Block(this.#configuration, deserialized);
		block.serialized = serialized.toString("hex");

		return block;
	}
}

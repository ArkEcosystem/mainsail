import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { INTERNAL_FACTORY, InternalFactory } from "./container";
import { Deserializer } from "./deserializer";
import { BlockSchemaError } from "@arkecosystem/core-contracts";
import { IDFactory } from "./id.factory";
import { Serializer } from "./serializer";

@injectable()
export class BlockFactory implements Crypto.IBlockFactory {
	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Serializer; // @TODO: create contract for block serializer

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer: Deserializer; // @TODO: create contract for block deserializer

	@inject(INTERNAL_FACTORY)
	private readonly blockFactory: InternalFactory; // @TODO: create contract for block deserializer

	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory: IDFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Crypto.ISignature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator: Crypto.IValidator;

	// @todo: add a proper type hint for data
	public async make(data: any, keys: Crypto.IKeyPair): Promise<Crypto.IBlock | undefined> {
		data.generatorPublicKey = keys.publicKey;

		const payloadHash: Buffer = this.serializer.serialize(data, false);
		const hash: Buffer = await this.hashFactory.sha256(payloadHash);

		data.blockSignature = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));

		data.id = await this.idFactory.make(data);

		return this.fromData(data);
	}

	public async fromHex(hex: string): Promise<Crypto.IBlock> {
		return this.fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<Crypto.IBlock> {
		return this.fromSerialized(buff);
	}

	public async fromJson(json: Crypto.IBlockJson): Promise<Crypto.IBlock | undefined> {
		// @ts-ignore
		const data: Crypto.IBlockData = { ...json };
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

	public async fromData(
		data: Crypto.IBlockData,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): Promise<Crypto.IBlock | undefined> {
		await this.#applySchema(data);

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);
		const block: Crypto.IBlock = await this.blockFactory({
			...(await this.deserializer.deserialize(serialized, false, options)),
			id: data.id,
		});
		block.serialized = serialized.toString("hex");

		return block;
	}

	private async fromSerialized(serialized: Buffer): Promise<Crypto.IBlock> {
		const deserialized: { data: Crypto.IBlockData; transactions: Crypto.ITransaction[] } =
			await this.deserializer.deserialize(serialized);

		const validated: Crypto.IBlockData | undefined = await this.#applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		const block: Crypto.IBlock = await this.blockFactory(deserialized);
		block.serialized = serialized.toString("hex");

		return block;
	}

	async #applySchema(data: Crypto.IBlockData): Promise<Crypto.IBlockData | undefined> {
		const result = await this.validator.validate("block", data);

		if (!result.error) {
			return result.value;
		}

		for (const error of result.errors) {
			let fatal = false;

			const match = error.dataPath.match(/\.transactions\[(\d+)]/);
			if (match === null) {
				fatal = true;
			} else {
				const txIndex = match[1];

				if (data.transactions) {
					const tx = data.transactions[txIndex];

					if (tx.id === undefined) {
						fatal = true;
					}
				}
			}

			if (fatal) {
				throw new BlockSchemaError(
					data.height,
					`Invalid data${error.dataPath ? " at " + error.dataPath : ""}: ` +
						`${error.message}: ${JSON.stringify(error.data)}`,
				);
			}
		}

		return result.value;
	}
}

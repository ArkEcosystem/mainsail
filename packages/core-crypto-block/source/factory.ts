import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IBlock,
	IBlockData,
	IBlockFactory,
	IBlockJson,
	IHashFactory,
	IKeyPair,
	ITransaction,
	IValidator,
	ISignature,
} from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { INTERNAL_FACTORY, InternalFactory } from "./container";
import { Deserializer } from "./deserializer";
import { BlockSchemaError } from "./errors";
import { IDFactory } from "./id.factory";
import { Serializer } from "./serializer";

@Container.injectable()
export class BlockFactory implements IBlockFactory {
	@Container.inject(BINDINGS.Block.Serializer)
	private readonly serializer: Serializer; // @TODO: create contract for block serializer

	@Container.inject(BINDINGS.Block.Deserializer)
	private readonly deserializer: Deserializer; // @TODO: create contract for block deserializer

	@Container.inject(INTERNAL_FACTORY)
	private readonly blockFactory: InternalFactory; // @TODO: create contract for block deserializer

	@Container.inject(BINDINGS.Block.IDFactory)
	private readonly idFactory: IDFactory;

	@Container.inject(BINDINGS.HashFactory)
	private readonly hashFactory: IHashFactory;

	@Container.inject(BINDINGS.Signature)
	private readonly signatureFactory: ISignature;

	@Container.inject(BINDINGS.Validator)
	private readonly validator: IValidator;

	// @todo: add a proper type hint for data
	public async make(data: any, keys: IKeyPair): Promise<IBlock | undefined> {
		data.generatorPublicKey = keys.publicKey;

		const payloadHash: Buffer = this.serializer.serialize(data, false);
		const hash: Buffer = await this.hashFactory.sha256(payloadHash);

		data.blockSignature = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));

		data.id = await this.idFactory.make(data);

		return this.fromData(data);
	}

	public async fromHex(hex: string): Promise<IBlock> {
		return this.fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<IBlock> {
		return this.fromSerialized(buff);
	}

	public async fromJson(json: IBlockJson): Promise<IBlock | undefined> {
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

	public async fromData(
		data: IBlockData,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): Promise<IBlock | undefined> {
		await this.#applySchema(data);

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);
		const block: IBlock = await this.blockFactory({
			...(await this.deserializer.deserialize(serialized, false, options)),
			id: data.id,
		});
		block.serialized = serialized.toString("hex");

		return block;
	}

	private async fromSerialized(serialized: Buffer): Promise<IBlock> {
		const deserialized: { data: IBlockData; transactions: ITransaction[] } = await this.deserializer.deserialize(
			serialized,
		);

		const validated: IBlockData | undefined = await this.#applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		const block: IBlock = await this.blockFactory(deserialized);
		block.serialized = serialized.toString("hex");

		return block;
	}

	async #applySchema(data: IBlockData): Promise<IBlockData | undefined> {
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

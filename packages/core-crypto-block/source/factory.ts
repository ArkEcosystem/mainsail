import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { sealBlock } from "./block";
import { IDFactory } from "./id.factory";

@injectable()
export class BlockFactory implements Contracts.Crypto.IBlockFactory {
	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer: Contracts.Crypto.IBlockDeserializer;

	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory: IDFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator: Contracts.Crypto.IValidator;

	public async make(
		data: Contracts.Crypto.IBlockData,
		keys: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IBlock | undefined> {
		data.generatorPublicKey = keys.publicKey;

		const payloadHash: Buffer = await this.serializer.serialize(data, false);
		const hash: Buffer = await this.hashFactory.sha256(payloadHash);

		data.blockSignature = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));

		data.id = await this.idFactory.make(data);

		return this.fromData(data);
	}

	public async fromHex(hex: string): Promise<Contracts.Crypto.IBlock> {
		return this.#fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.IBlock> {
		return this.#fromSerialized(buff);
	}

	public async fromJson(json: Contracts.Crypto.IBlockJson): Promise<Contracts.Crypto.IBlock | undefined> {
		// @ts-ignore
		const data: Contracts.Crypto.IBlockData = { ...json };
		data.totalAmount = BigNumber.make(data.totalAmount);
		data.totalFee = BigNumber.make(data.totalFee);
		data.reward = BigNumber.make(data.reward);

		if (data.transactions) {
			for (const transaction of data.transactions) {
				transaction.amount = BigNumber.make(transaction.amount);
				transaction.fee = BigNumber.make(transaction.fee);
				transaction.nonce = BigNumber.make(transaction.nonce);
			}
		}

		return this.fromData(data);
	}

	public async fromData(data: Contracts.Crypto.IBlockData): Promise<Contracts.Crypto.IBlock | undefined> {
		await this.#applySchema(data);

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);

		return sealBlock({
			...(await this.deserializer.deserialize(serialized, false)),
			serialized: serialized.toString("hex"),
		});
	}

	async #fromSerialized(serialized: Buffer): Promise<Contracts.Crypto.IBlock> {
		const deserialized: { data: Contracts.Crypto.IBlockData; transactions: Contracts.Crypto.ITransaction[] } =
			await this.deserializer.deserialize(serialized);

		const validated: Contracts.Crypto.IBlockData | undefined = await this.#applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		return sealBlock({
			...deserialized,
			serialized: serialized.toString("hex"),
		});
	}

	async #applySchema(data: Contracts.Crypto.IBlockData): Promise<Contracts.Crypto.IBlockData | undefined> {
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
				throw new Exceptions.BlockSchemaError(
					data.height,
					`Invalid data${error.dataPath ? " at " + error.dataPath : ""}: ` +
						`${error.message}: ${JSON.stringify(error.data)}`,
				);
			}
		}

		return result.value;
	}
}

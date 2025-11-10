import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { BlockSchemaError } from "@mainsail/exceptions";
import { BigNumber } from "@mainsail/utils";

import { sealBlock } from "./block.js";
import { HashFactory } from "./hash.factory.js";

@injectable()
export class BlockFactory implements Contracts.Crypto.BlockFactory {
	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer!: Contracts.Crypto.BlockSerializer;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer!: Contracts.Crypto.BlockDeserializer;

	@inject(Identifiers.Cryptography.Block.HashFactory)
	private readonly hashFactory!: HashFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	public async make(
		data: Utils.Mutable<Contracts.Crypto.BlockDataSerializable>,
		transactions: Contracts.Crypto.Transaction[],
	): Promise<Contracts.Crypto.Block> {
		const block: Contracts.Crypto.BlockData = { ...data, hash: await this.hashFactory.make(data) };

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);

		return sealBlock({
			data: block,
			serialized: serialized.toString("hex"),
			transactions,
		});
	}

	public async fromHex(hex: string): Promise<Contracts.Crypto.Block> {
		return this.#fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.Block> {
		return this.#fromSerialized(buff);
	}

	public async fromJson(json: Contracts.Crypto.BlockJson): Promise<Contracts.Crypto.Block> {
		// @ts-ignore
		const data: Utils.Mutable<Contracts.Crypto.BlockData> = { ...json };
		data.fee = BigNumber.make(data.fee);
		data.reward = BigNumber.make(data.reward);

		if (data.transactions) {
			for (const transaction of data.transactions) {
				transaction.value = BigNumber.make(transaction.value);
				transaction.nonce = BigNumber.make(transaction.nonce);
			}
		}

		return this.fromData(data);
	}

	public async fromData(data: Contracts.Crypto.BlockData): Promise<Contracts.Crypto.Block> {
		await this.#applySchema(data);

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);

		return sealBlock({
			...(await this.deserializer.deserializeWithTransactions(serialized)),
			serialized: serialized.toString("hex"),
		});
	}

	public async fromStorage(
		header: Contracts.Evm.BlockHeaderStorageData,
		transactions: Contracts.Evm.TransactionStorageData[],
	): Promise<Contracts.Crypto.Block> {
		const parsedTransactions = await Promise.all(transactions.map((tx) => this.transactionFactory.fromStorage(tx)));

		return sealBlock({
			data: {
				fee: BigNumber.make(header.fee),
				gasUsed: header.gasUsed,
				hash: header.hash,
				logsBloom: header.logsBloom,
				number: header.number,
				parentHash: header.parentHash,
				payloadSize: header.payloadSize,
				proposer: header.proposer,
				reward: BigNumber.make(header.reward),
				round: header.round,
				stateRoot: header.stateRoot,
				timestamp: Number(header.timestamp),
				transactions: parsedTransactions.map((tx) => tx.data),
				transactionsCount: header.transactionsCount,
				transactionsRoot: header.transactionsRoot,
				version: header.version,
			},
			serialized: "",
			transactions: parsedTransactions,
		});
	}

	async #fromSerialized(serialized: Buffer): Promise<Contracts.Crypto.Block> {
		const deserialized = await this.deserializer.deserializeWithTransactions(serialized);

		const validated: Contracts.Crypto.BlockData | undefined = await this.#applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		return sealBlock({
			...deserialized,
			serialized: serialized.toString("hex"),
		});
	}

	async #applySchema(data: Contracts.Crypto.BlockData): Promise<Contracts.Crypto.BlockData> {
		const result = this.validator.validate("block", data);

		if (!result.error) {
			return result.value;
		}

		for (const error of result.errors ?? []) {
			let fatal = false;

			const match = error.instancePath.match(/\.transactions\[(\d+)]/);
			if (match === null) {
				fatal = true;
			} else {
				if (data.transactions) {
					const txIndex = Number(match[1]);
					const tx = data.transactions[txIndex];

					if (tx.hash === undefined) {
						fatal = true;
					}
				}
			}

			if (fatal) {
				throw new BlockSchemaError(
					data.number,
					`Invalid data${error.instancePath ? " at " + error.instancePath : ""}: ` +
						`${error.message}: ${JSON.stringify(error.data)}`,
				);
			}
		}

		return result.value;
	}
}

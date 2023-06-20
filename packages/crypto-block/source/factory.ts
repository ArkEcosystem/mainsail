import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers, Utils } from "@mainsail/contracts";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

import { sealBlock } from "./block";
import { IDFactory } from "./id.factory";

@injectable()
export class BlockFactory implements Contracts.Crypto.IBlockFactory {
	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer!: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IBlockDeserializer;

	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory!: IDFactory;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	public async make(data: Utils.Mutable<Contracts.Crypto.IBlockDataSerializable>): Promise<Contracts.Crypto.IBlock> {
		const block = data as Utils.Mutable<Contracts.Crypto.IBlockData>;
		block.id = await this.idFactory.make(data);

		return this.fromData(block);
	}

	public async fromHex(hex: string): Promise<Contracts.Crypto.IBlock> {
		return this.#fromSerialized(Buffer.from(hex, "hex"));
	}

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.IBlock> {
		return this.#fromSerialized(buff);
	}

	public async fromJson(json: Contracts.Crypto.IBlockJson): Promise<Contracts.Crypto.IBlock> {
		// @ts-ignore
		const data: Utils.Mutable<Contracts.Crypto.IBlockData> = { ...json };
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

	// TODO: separate factory ?
	public async fromProposedBytes(buff: Buffer): Promise<Contracts.Crypto.IProposedBlock> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const lockProofLength = buffer.readUint8();
		let lockProof: Contracts.Crypto.IBlockLockProof | undefined;
		if (lockProofLength > 0) {
			const lockProofBuffer = buffer.readBytes(lockProofLength);
			lockProof = await this.deserializer.deserializeLockProof(lockProofBuffer);
		}

		const block = await this.#fromSerialized(buffer.getRemainder());

		return {
			block,
			lockProof,
			serialized: buff.toString("hex"),
		};
	}

	// TODO: separate factory ?
	public async fromProposedJson(json: Contracts.Crypto.IProposedBlockJson): Promise<Contracts.Crypto.IProposedBlock> {
		const block = await this.fromJson(json.block);
		return {
			block,
			lockProof: json.lockProof,
			serialized: json.serialized,
		};
	}

	// TODO: separate factory ?
	public async fromCommittedBytes(buff: Buffer): Promise<Contracts.Crypto.ICommittedBlock> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const commitBuffer = buffer.readBytes(this.serializer.commitSize());
		const commit = await this.deserializer.deserializeCommit(commitBuffer);

		const block = await this.#fromSerialized(buffer.getRemainder());

		return {
			block,
			commit,
			serialized: buff.toString("hex"),
		};
	}

	// TODO: separate factory ?
	public async fromCommittedJson(
		json: Contracts.Crypto.ICommittedBlockJson,
	): Promise<Contracts.Crypto.ICommittedBlock> {
		const block = await this.fromJson(json.block);
		return {
			block,
			commit: json.commit,
			serialized: json.serialized,
		};
	}

	public async fromData(data: Contracts.Crypto.IBlockData): Promise<Contracts.Crypto.IBlock> {
		await this.#applySchema(data);

		const serialized: Buffer = await this.serializer.serializeWithTransactions(data);

		return sealBlock({
			...(await this.deserializer.deserializeWithTransactions(serialized)),
			serialized: serialized.toString("hex"),
		});
	}

	async #fromSerialized(serialized: Buffer): Promise<Contracts.Crypto.IBlock> {
		const deserialized = await this.deserializer.deserializeWithTransactions(serialized);

		const validated: Contracts.Crypto.IBlockData | undefined = await this.#applySchema(deserialized.data);

		if (validated) {
			deserialized.data = validated;
		}

		return sealBlock({
			...deserialized,
			serialized: serialized.toString("hex"),
		});
	}

	async #applySchema(data: Contracts.Crypto.IBlockData): Promise<Contracts.Crypto.IBlockData> {
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
				const txIndex = match[1];

				if (data.transactions) {
					const tx = data.transactions[txIndex];

					if (tx.id === undefined) {
						fatal = true;
					}
				}
			}

			if (fatal) {
				console.log("Block data:", data);
				console.trace();

				throw new Exceptions.BlockSchemaError(
					data.height,
					`Invalid data${error.instancePath ? " at " + error.instancePath : ""}: ` +
						`${error.message}: ${JSON.stringify(error.data)}`,
				);
			}
		}

		return result.value;
	}
}

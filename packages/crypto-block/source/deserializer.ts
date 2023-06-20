/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { TransactionFactory } from "@mainsail/crypto-transaction";
import { ByteBuffer } from "@mainsail/utils";

import { IDFactory } from "./id.factory";

@injectable()
export class Deserializer implements Contracts.Crypto.IBlockDeserializer {
	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory!: IDFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: TransactionFactory;

	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "wallet")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	public async deserializeHeader(serialized: Buffer): Promise<Contracts.Crypto.IBlockHeader> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const header: Utils.Mutable<Contracts.Crypto.IBlockData> = await this.#deserializeBufferHeader(buffer);

		header.id = await this.idFactory.make(header);

		return header;
	}

	public async deserializeWithTransactions(serialized: Buffer): Promise<Contracts.Crypto.IBlockWithTransactions> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const block: Utils.Mutable<Contracts.Crypto.IBlockData> = await this.#deserializeBufferHeader(buffer);

		let transactions: Contracts.Crypto.ITransaction[] = [];

		if (buffer.getRemainderLength() > 0) {
			transactions = await this.#deserializeTransactions(block, buffer);
		}

		block.id = await this.idFactory.make(block);

		return { data: block, transactions };
	}

	public async deserializeLockProof(serialized: Buffer): Promise<Contracts.Crypto.IBlockLockProof> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const commit = {} as Contracts.Crypto.IBlockLockProof;

		await this.serializer.deserialize<Contracts.Crypto.IBlockLockProof>(buffer, commit, {
			length: this.blockSerializer.lockProofSize(),
			schema: {
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});

		return commit;
	}

	public async deserializeCommit(serialized: Buffer): Promise<Contracts.Crypto.IBlockCommit> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const commit = {} as Contracts.Crypto.IBlockCommit;

		await this.serializer.deserialize<Contracts.Crypto.IBlockCommit>(buffer, commit, {
			length: this.blockSerializer.commitSize(),
			schema: {
				blockId: {
					type: "hash",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});

		return commit;
	}

	async #deserializeBufferHeader(buffer: ByteBuffer): Promise<Contracts.Crypto.IBlockHeader> {
		const block = {} as Contracts.Crypto.IBlockHeader;

		await this.serializer.deserialize<Contracts.Crypto.IBlockData>(buffer, block, {
			length: this.blockSerializer.headerSize(),
			schema: {
				version: {
					type: "uint32",
				},
				timestamp: {
					type: "uint32",
				},
				height: {
					type: "uint32",
				},
				previousBlock: {
					type: "hash",
				},
				numberOfTransactions: {
					type: "uint32",
				},
				totalAmount: {
					type: "bigint",
				},
				totalFee: {
					type: "bigint",
				},
				reward: {
					type: "bigint",
				},
				payloadLength: {
					type: "uint32",
				},
				payloadHash: {
					type: "hash",
				},
				generatorPublicKey: {
					type: "publicKey",
				},
			},
		});

		return block;
	}

	async #deserializeTransactions(
		block: Contracts.Crypto.IBlockData,
		buf: ByteBuffer,
	): Promise<Contracts.Crypto.ITransaction[]> {
		await this.serializer.deserialize<Contracts.Crypto.IBlockData>(buf, block, {
			length: block.payloadLength,
			schema: {
				transactions: {
					type: "transactions",
				},
			},
		});

		/**
		 * After unpacking we need to turn the transactions into DTOs!
		 *
		 * We keep this behaviour out of the (de)serialiser because it
		 * is very specific to this bit of code in this specific class.
		 */
		const transactions: Contracts.Crypto.ITransaction[] = [];

		for (let index = 0; index < block.transactions.length; index++) {
			const transaction = await this.transactionFactory.fromBytes(block.transactions[index] as any);

			transactions.push(transaction);

			block.transactions[index] = transaction.data;
		}

		return transactions;
	}
}

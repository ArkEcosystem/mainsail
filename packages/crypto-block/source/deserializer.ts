/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { TransactionFactory } from "@mainsail/crypto-transaction";
import { ByteBuffer } from "@mainsail/utils";

import { IDFactory } from "./id.factory";

@injectable()
export class Deserializer implements Contracts.Crypto.BlockDeserializer {
	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory!: IDFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: TransactionFactory;

	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.BlockSerializer;

	public async deserializeHeader(serialized: Buffer): Promise<Contracts.Crypto.BlockHeader> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const header: Utils.Mutable<Contracts.Crypto.BlockData> = await this.#deserializeBufferHeader(buffer);

		header.id = await this.idFactory.make(header);

		return header;
	}

	public async deserializeWithTransactions(serialized: Buffer): Promise<Contracts.Crypto.BlockWithTransactions> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const block: Utils.Mutable<Contracts.Crypto.BlockData> = await this.#deserializeBufferHeader(buffer);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (buffer.getRemainderLength() > 0) {
			transactions = await this.#deserializeTransactions(block, buffer);
		}

		block.id = await this.idFactory.make(block);

		return { data: block, transactions };
	}

	async #deserializeBufferHeader(buffer: ByteBuffer): Promise<Contracts.Crypto.BlockHeader> {
		const block = {} as Contracts.Crypto.BlockHeader;

		await this.serializer.deserialize<Contracts.Crypto.BlockData>(buffer, block, {
			length: this.blockSerializer.headerSize(),
			schema: {
				version: {
					type: "uint8",
				},
				timestamp: {
					type: "uint48",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				previousBlock: {
					type: "hash",
				},
				numberOfTransactions: {
					type: "uint16",
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
		block: Contracts.Crypto.BlockData,
		buf: ByteBuffer,
	): Promise<Contracts.Crypto.Transaction[]> {
		await this.serializer.deserialize<Contracts.Crypto.BlockData>(buf, block, {
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
		const transactions: Contracts.Crypto.Transaction[] = [];

		for (let index = 0; index < block.transactions.length; index++) {
			const transaction = await this.transactionFactory.fromBytes(block.transactions[index] as any);

			transactions.push(transaction);

			block.transactions[index] = transaction.data;
		}

		return transactions;
	}
}

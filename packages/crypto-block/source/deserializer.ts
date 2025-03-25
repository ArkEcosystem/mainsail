/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { TransactionFactory } from "@mainsail/crypto-transaction";
import { ByteBuffer, sleep } from "@mainsail/utils";

import { HashFactory } from "./hash.factory.js";

@injectable()
export class Deserializer implements Contracts.Crypto.BlockDeserializer {
	@inject(Identifiers.Cryptography.Block.HashFactory)
	private readonly hashFactory!: HashFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: TransactionFactory;

	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	public async deserializeHeader(serialized: Buffer): Promise<Contracts.Crypto.BlockHeader> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const header: Utils.Mutable<Contracts.Crypto.BlockData> = await this.#deserializeBufferHeader(buffer);

		header.hash = await this.hashFactory.make(header);

		return header;
	}

	public async deserializeWithTransactions(serialized: Buffer): Promise<Contracts.Crypto.BlockWithTransactions> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const block: Utils.Mutable<Contracts.Crypto.BlockData> = await this.#deserializeBufferHeader(buffer);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (buffer.getRemainderLength() > 0) {
			transactions = await this.#deserializeTransactions(block, buffer);
		}

		block.hash = await this.hashFactory.make(block);

		return { data: block, transactions };
	}

	async #deserializeBufferHeader(buffer: ByteBuffer): Promise<Contracts.Crypto.BlockHeader> {
		const block = {} as Contracts.Crypto.BlockHeader;

		await this.serializer.deserialize<Contracts.Crypto.BlockData>(buffer, block, {
			length: this.headerSize(),
			schema: {
				version: {
					type: "uint8",
				},
				timestamp: {
					type: "uint48",
				},
				number: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				parentHash: {
					type: "hash",
				},
				stateRoot: {
					type: "hash",
				},
				logsBloom: {
					type: "hash",
					size: 256,
				},
				transactionsCount: {
					type: "uint16",
				},
				gasUsed: {
					type: "uint32",
				},
				amount: {
					type: "uint256",
				},
				fee: {
					type: "uint256",
				},
				reward: {
					type: "uint256",
				},
				payloadSize: {
					type: "uint32",
				},
				transactionsRoot: {
					type: "hash",
				},
				proposer: {
					type: "address",
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
			length: block.payloadSize,
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
			if (index % 20 === 0) {
				await sleep(0);
			}

			const transaction = await this.transactionFactory.fromBytes(block.transactions[index] as any);

			transactions.push(transaction);

			block.transactions[index] = transaction.data;
		}

		return transactions;
	}
}

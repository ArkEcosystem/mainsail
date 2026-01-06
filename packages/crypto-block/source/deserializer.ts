import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { TransactionSchemaError } from "@mainsail/exceptions";
import { ByteBuffer, sleep } from "@mainsail/utils";

import { HashFactory } from "./hash.factory.js";
import { schema, transactionsSchema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.BlockDeserializer {
	@inject(Identifiers.Cryptography.Block.HashFactory)
	private readonly hashFactory!: HashFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly transactionDeserializer!: Contracts.Crypto.TransactionDeserializer;

	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	@optional()
	private readonly workerPool: Contracts.Crypto.WorkerPool | undefined;

	public async deserializeHeader(serialized: Buffer): Promise<Contracts.Crypto.BlockHeader> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const header = await this.#deserializeBufferHeader(buffer);

		return {
			...header,
			hash: await this.hashFactory.make(header),
		};
	}

	public async deserializeWithTransactions(serialized: Buffer): Promise<Contracts.Crypto.BlockWithTransactions> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const header = await this.#deserializeBufferHeader(buffer);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (buffer.getRemainderLength() > 0) {
			transactions = await this.#deserializeTransactions(header, buffer);
		}

		return {
			data: {
				...header,
				hash: await this.hashFactory.make(header),
				transactions: transactions.map((tx) => tx.data),
			},
			transactions,
		};
	}

	async #deserializeBufferHeader(buffer: ByteBuffer): Promise<Contracts.Crypto.BlockHeaderRaw> {
		return await this.serializer.deserialize<Contracts.Crypto.BlockHeaderRaw>(
			buffer,
			{},
			{
				length: this.headerSize(),
				schema,
			},
		);
	}

	async #deserializeTransactions(
		header: Contracts.Crypto.BlockHeaderRaw,
		buf: ByteBuffer,
	): Promise<Contracts.Crypto.Transaction[]> {
		const block = await this.serializer.deserialize<Contracts.Crypto.BlockData>(
			buf,
			{ ...header },
			{
				length: header.payloadSize,
				schema: transactionsSchema,
			},
		);

		/**
		 * After unpacking we need to turn the transactions into DTOs!
		 *
		 * We keep this behavior out of the (de)serializer because it
		 * is very specific to this bit of code in this specific class.
		 */
		const transactions: Contracts.Crypto.Transaction[] = Array.from({ length: block.transactionsCount });

		await Promise.all(
			block.transactions.map(async (serialized, index) => {
				const transaction = await this.transactionDeserializer.deserialize(serialized as unknown as Buffer);

				if (index % 20 === 0) {
					await sleep(0);
				}

				const computed = await this.#computeCryptoData(transaction.data);
				if (computed.schemaError) {
					throw new TransactionSchemaError(computed.schemaError);
				}

				transaction.data.data = transaction.data.data.startsWith("0x")
					? transaction.data.data.slice(2)
					: transaction.data.data;
				transaction.data.hash = computed.hash;
				transaction.data.from = computed.address;
				transaction.data.senderPublicKey = computed.publicKey;
				transaction.data.senderLegacyAddress = computed.legacyAddress;

				transactions[index] = transaction;
				block.transactions[index] = transaction.data;
			}),
		);

		return transactions;
	}

	async #computeCryptoData(
		transaction: Contracts.Crypto.TransactionData,
	): Promise<Contracts.Crypto.TransactionCryptoData> {
		if (this.workerPool) {
			const worker = await this.workerPool.getWorker();
			return worker.transactionFactory("computeCryptoData", transaction);
		}

		return this.transactionFactory.computeCryptoData(transaction);
	}
}

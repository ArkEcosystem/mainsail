/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionFactory } from "@arkecosystem/core-crypto-transaction";
import ByteBuffer from "bytebuffer";

import { IDFactory } from "./id.factory";

@injectable()
export class Deserializer implements Contracts.Crypto.IBlockDeserializer {
	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory: IDFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: TransactionFactory;

	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer: Contracts.Serializer.ISerializer;

	public async deserialize(
		serialized: Buffer,
		headerOnly = false,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): Promise<{ data: Contracts.Crypto.IBlockData; transactions: Contracts.Crypto.ITransaction[] }> {
		const block = {} as Contracts.Crypto.IBlockData;
		let transactions: Contracts.Crypto.ITransaction[] = [];

		const buf: ByteBuffer = new ByteBuffer(serialized.length, true);
		buf.append(serialized);
		buf.reset();

		await this.serializer.deserialize<Contracts.Crypto.IBlockData>(buf, block, {
			length: 512,
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
				blockSignature: {
					type: "signature",
				},
			},
		});

		headerOnly = headerOnly || buf.remaining() === 0;

		if (!headerOnly) {
			transactions = await this.deserializeTransactions(block, buf, options.deserializeTransactionsUnchecked);
		}

		block.id = await this.idFactory.make(block);

		return { data: block, transactions };
	}

	private async deserializeTransactions(
		block: Contracts.Crypto.IBlockData,
		buf: ByteBuffer,
		deserializeTransactionsUnchecked = false,
	): Promise<Contracts.Crypto.ITransaction[]> {
		await this.serializer.deserialize<Contracts.Crypto.IBlockData>(buf, block, {
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
			const transaction = deserializeTransactionsUnchecked
				? await this.transactionFactory.fromBytesUnsafe(block.transactions[index] as any)
				: await this.transactionFactory.fromBytes(block.transactions[index] as any);

			transactions.push(transaction);

			block.transactions[index] = transaction.data;
		}

		return transactions;
	}
}

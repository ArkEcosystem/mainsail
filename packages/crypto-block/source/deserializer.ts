import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidBlockBytesError } from "@mainsail/exceptions";
import { ByteBuffer } from "@mainsail/utils";

import { HashFactory } from "./hash.factory.js";
import { blockHeaderSchema, transactionsSchema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.BlockDeserializer {
	@inject(Identifiers.Cryptography.Block.HashFactory)
	private readonly hashFactory!: HashFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

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

		if (buffer.getRemainderLength() !== 0) {
			throw new InvalidBlockBytesError(`Found trailing bytes of length ${buffer.getRemainderLength()}`);
		}

		return {
			data: {
				...header,
				hash: await this.hashFactory.make(header),
			},
			transactions,
		};
	}

	async #deserializeBufferHeader(buffer: ByteBuffer): Promise<Contracts.Crypto.BlockHeaderRaw> {
		const header = await this.serializer.deserialize<Contracts.Crypto.BlockHeaderRaw>(
			buffer,
			{},
			{
				length: this.headerSize(),
				schema: blockHeaderSchema,
			},
		);

		if (buffer.getRemainderLength() !== header.payloadSize) {
			throw new InvalidBlockBytesError(
				`Payload size ${header.payloadSize} does not match actual payload size ${buffer.getRemainderLength()}`,
			);
		}

		return header;
	}

	async #deserializeTransactions(
		header: Contracts.Crypto.BlockHeaderRaw,
		buf: ByteBuffer,
	): Promise<Contracts.Crypto.Transaction[]> {
		const block = await this.serializer.deserialize<Contracts.Crypto.BlockSerializable>(
			buf,
			{ ...header },
			{
				length: header.payloadSize,
				schema: transactionsSchema,
			},
		);

		return Promise.all(
			block.transactions.map(async (serialized) =>
				this.transactionFactory.fromBytes(serialized as unknown as Buffer),
			),
		);
	}
}

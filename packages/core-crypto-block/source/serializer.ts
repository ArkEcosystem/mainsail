/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IBlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer: Contracts.Serializer.ISerializer;

	public size(block: Contracts.Crypto.IBlock): number {
		const headerSize =
			4 + // version
			8 + // timestamp
			4 + // height
			32 + // previousBlock
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			block.data.payloadHash.length / 2 +
			block.data.generatorPublicKey.length / 2;

		let size = headerSize + block.data.blockSignature.length / 2;

		for (const transaction of block.transactions) {
			size += 4 /* tx length */ + transaction.serialized.length;
		}

		return size;
	}

	public async serialize(block: Contracts.Crypto.IBlockData, includeSignature = true): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockData>(block, {
			length: 512,
			schema: {
				version: {
					type: "uint32",
				},
				timestamp: {
					type: "uint64",
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
					required: includeSignature,
				},
			},
		});
	}

	public async serializeWithTransactions(block: Contracts.Crypto.IBlockData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockData>(block, {
			length: 1024,
			schema: {
				version: {
					type: "uint32",
				},
				timestamp: {
					type: "uint64",
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
				transactions: {
					type: "transactions",
				},
			},
		});
	}
}

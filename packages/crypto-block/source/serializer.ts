/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IBlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "wallet")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	public size(block: Contracts.Crypto.IBlock): number {
		const headerSize =
			4 + // version
			4 + // timestamp
			4 + // height
			32 + // previousBlock
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			block.data.payloadHash.length / 2 +
			block.data.generatorPublicKey.length / 2;

		let size = headerSize;

		for (const transaction of block.transactions) {
			size += 4 /* tx length */ + transaction.serialized.length;
		}

		return size;
	}

	public async serialize(block: Contracts.Crypto.IBlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockDataSerializable>(block, {
			length: 2_000_000,
			skip: 0,
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
	}

	public async serializeWithTransactions(block: Contracts.Crypto.IBlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockDataSerializable>(block, {
			length: 2_000_000,
			skip: 0,
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
				transactions: {
					type: "transactions",
				},
			},
		});
	}
}

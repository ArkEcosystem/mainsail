/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IBlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "wallet")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	@inject(Identifiers.Cryptography.Size.SHA256)
	private readonly hashByteLength!: number;

	@inject(Identifiers.Cryptography.Size.PublicKey)
	@tagged("type", "wallet")
	private readonly generatorPublicKeyByteLength!: number;

	public headerSize(): number {
		return 4 + // version
			4 + // timestamp
			4 + // height
			this.hashByteLength + // previousBlock
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			this.hashByteLength + // payloadHash
			this.generatorPublicKeyByteLength;
	}

	public totalSize(block: Contracts.Crypto.IBlockDataSerializable): number {
		return this.headerSize() + block.payloadLength;
	}

	public async serializeHeader(block: Contracts.Crypto.IBlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockDataSerializable>(block, {
			length: this.headerSize(),
			skip: 0,
			schema: {
				version: {
					type: "uint32",
					required: true,
				},
				timestamp: {
					type: "uint32",
					required: true,
				},
				height: {
					type: "uint32",
					required: true,
				},
				previousBlock: {
					type: "hash",
					required: true,
				},
				numberOfTransactions: {
					type: "uint32",
					required: true,
				},
				totalAmount: {
					type: "bigint",
					required: true,
				},
				totalFee: {
					type: "bigint",
					required: true,
				},
				reward: {
					type: "bigint",
					required: true,
				},
				payloadLength: {
					type: "uint32",
					required: true,
				},
				payloadHash: {
					type: "hash",
					required: true,
				},
				generatorPublicKey: {
					type: "publicKey",
					required: true,
				},
			},
		});
	}

	public async serializeWithTransactions(block: Contracts.Crypto.IBlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockDataSerializable>(block, {
			length: this.totalSize(block),
			skip: 0,
			schema: {
				version: {
					type: "uint32",
					required: true,
				},
				timestamp: {
					type: "uint32",
					required: true,
				},
				height: {
					type: "uint32",
					required: true,
				},
				previousBlock: {
					type: "hash",
					required: true,
				},
				numberOfTransactions: {
					type: "uint32",
					required: true,
				},
				totalAmount: {
					type: "bigint",
					required: true,
				},
				totalFee: {
					type: "bigint",
					required: true,
				},
				reward: {
					type: "bigint",
					required: true,
				},
				payloadLength: {
					type: "uint32",
					required: true,
				},
				payloadHash: {
					type: "hash",
					required: true,
				},
				generatorPublicKey: {
					type: "publicKey",
					required: true,
				},
				transactions: {
					type: "transactions",
					required: false,
				},
			},
		});
	}
}

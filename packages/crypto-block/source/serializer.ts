/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.BlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "wallet")
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Size.SHA256)
	private readonly hashByteLength!: number;

	@inject(Identifiers.Cryptography.Size.PublicKey)
	@tagged("type", "wallet")
	private readonly generatorPublicKeyByteLength!: number;

	public headerSize(): number {
		return (
			1 + // version
			6 + // timestamp
			4 + // height
			this.hashByteLength + // previousBlock
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			this.hashByteLength + // payloadHash
			this.generatorPublicKeyByteLength
		);
	}

	public totalSize(block: Contracts.Crypto.BlockDataSerializable): number {
		return this.headerSize() + block.payloadLength;
	}

	public async serializeHeader(block: Contracts.Crypto.BlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.BlockDataSerializable>(block, {
			length: this.headerSize(),
			skip: 0,
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

	public async serializeWithTransactions(block: Contracts.Crypto.BlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.BlockDataSerializable>(block, {
			length: this.totalSize(block),
			skip: 0,
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

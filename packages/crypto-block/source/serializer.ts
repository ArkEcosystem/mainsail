/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.BlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "wallet")
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Hash.Size.SHA256)
	private readonly hashByteLength!: number;

	@inject(Identifiers.Cryptography.Identity.Address.Size)
	private readonly generatorAddressByteLength!: number;

	public headerSize(): number {
		return (
			1 + // version
			6 + // timestamp
			4 + // height
			4 + // round
			this.hashByteLength + // previousBlock
			this.hashByteLength + // stateHash
			2 + // numberOfTransactions
			4 + // totalGasUsed
			32 + // totalAmount
			32 + // totalFee
			32 + // reward
			4 + // payloadLength
			this.hashByteLength + // payloadHash
			this.generatorAddressByteLength
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
				round: {
					type: "uint32",
				},
				previousBlock: {
					type: "hash",
				},
				stateHash: {
					type: "hash",
				},
				numberOfTransactions: {
					type: "uint16",
				},
				totalGasUsed: {
					type: "uint32",
				},
				totalAmount: {
					type: "uint256",
				},
				totalFee: {
					type: "uint256",
				},
				reward: {
					type: "uint256",
				},
				payloadLength: {
					type: "uint32",
				},
				payloadHash: {
					type: "hash",
				},
				generatorPublicKey: {
					type: "address",
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
				round: {
					type: "uint32",
				},
				previousBlock: {
					type: "hash",
				},
				stateHash: {
					type: "hash",
				},
				numberOfTransactions: {
					type: "uint16",
				},
				totalGasUsed: {
					type: "uint32",
				},
				totalAmount: {
					type: "uint256",
				},
				totalFee: {
					type: "uint256",
				},
				reward: {
					type: "uint256",
				},
				payloadLength: {
					type: "uint32",
				},
				payloadHash: {
					type: "hash",
				},
				generatorPublicKey: {
					type: "address",
				},
				transactions: {
					type: "transactions",
				},
			},
		});
	}
}

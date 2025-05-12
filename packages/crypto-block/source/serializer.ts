/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.BlockSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	public totalSize(block: Contracts.Crypto.BlockDataSerializable): number {
		return this.headerSize() + block.payloadSize;
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
				transactions: {
					type: "transactions",
				},
			},
		});
	}
}

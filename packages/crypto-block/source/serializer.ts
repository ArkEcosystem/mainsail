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

	@inject(Identifiers.Cryptography.Size.Signature)
	@tagged("type", "consensus")
	private readonly consensusSignatureByteLength!: number;

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

	public commitSize(): number {
		return (
			this.hashByteLength + // blockId
			4 + // height
			4 + // round
			+this.lockProofSize()
		);
	}

	public lockProofSize(): number {
		return (
			this.consensusSignatureByteLength + // signature
			1 +
			8 // validator set bitmap
		);
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

	public async serializeWithTransactions(block: Contracts.Crypto.IBlockDataSerializable): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockDataSerializable>(block, {
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

	public async serializeLockProof(lockProof: Contracts.Crypto.IValidatorSetMajority): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IValidatorSetMajority>(lockProof, {
			length: this.lockProofSize(),
			skip: 0,
			schema: {
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});
	}

	public async serializeProposed(proposedBlock: Contracts.Crypto.IProposedBlockSerializable): Promise<Buffer> {
		const serializedBlock = Buffer.from(proposedBlock.block.serialized, "hex");

		// NOTE: The lock proof is undefined most of the time, hence we can safe a lot of bytes
		// here by explicitly storing it's length instead of padding it with zero bytes.
		if (proposedBlock.lockProof) {
			const serializedLockProof = await this.serializeLockProof(proposedBlock.lockProof);
			const proofLength = Buffer.of(serializedLockProof.length);
			return Buffer.concat([proofLength, serializedLockProof, serializedBlock]);
		}

		return Buffer.concat([Buffer.of(0), serializedBlock]);
	}

	public async serializeCommit(commit: Contracts.Crypto.IBlockCommit): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IBlockCommit>(commit, {
			length: this.commitSize(),
			skip: 0,
			schema: {
				blockId: {
					type: "hash",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});
	}

	public async serializeFull(committedBlock: Contracts.Crypto.ICommittedBlockSerializable): Promise<Buffer> {
		const serializedCommit = await this.serializeCommit(committedBlock.commit);
		const serializedBlock = Buffer.from(committedBlock.block.serialized, "hex");
		return Buffer.concat([serializedCommit, serializedBlock]);
	}
}

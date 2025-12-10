/* eslint-disable sort-keys-fix/sort-keys-fix */
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.MessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Hash.Size.SHA256)
	private readonly hashSize!: number;

	public lockProofSize(): number {
		return (
			this.signatureSize + // signature
			1 +
			8 // validator set bitmap
		);
	}

	public async serializeProposal(
		proposal: Contracts.Crypto.SerializableProposalData,
		options: Contracts.Crypto.SerializeProposalOptions,
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SerializableProposalData>(proposal, {
			length:
				4 + // round
				(proposal.validRound === undefined ? 1 : 5) + // validRound
				4 + // serialized data length
				proposal.data.serialized.length / 2 + // serialized data
				1 + // validatorIndex
				(options.includeSignature ? this.signatureSize : 0), // signature
			skip: 0,
			schema: {
				round: {
					type: "uint32",
				},
				validRound: {
					optional: true,
					type: "uint32",
				},
				data: {
					type: "hex",
				},
				validatorIndex: {
					type: "uint8",
				},
				...(options.includeSignature
					? {
							signature: {
								type: "consensusSignature",
							},
						}
					: {}),
			},
		});
	}

	public async serializeMessage(message: Contracts.Crypto.MessageData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.MessageData>(message, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 + // validatorIndex
				1 +
				(message.blockHash ? this.hashSize : 0) + // blockHash
				this.signatureSize, // signature
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				blockNumber: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockHash: {
					type: "blockHash",
					optional: true,
				},
				validatorIndex: {
					type: "uint8",
				},
				signature: {
					type: "consensusSignature",
				},
			},
		});
	}

	public async serializeMessageForSignature(message: Contracts.Crypto.SignatureMessageData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignatureMessageData>(message, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 +
				(message.blockHash ? this.hashSize : 0), // blockHash
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				blockNumber: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockHash: {
					type: "blockHash",
					optional: true,
				},
			},
		});
	}

	public async serializeLockProof(lockProof: Contracts.Crypto.AggregatedSignature): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.AggregatedSignature>(lockProof, {
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

	public async serializeProposed(proposedBlock: Contracts.Crypto.ProposedBlockSerializable): Promise<Buffer> {
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
}

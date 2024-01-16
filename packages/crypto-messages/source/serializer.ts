/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

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
				4 + // serialized block length
				proposal.block.serialized.length / 2 + // serialized block
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
				block: {
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

	public async serializePrecommit(precommit: Contracts.Crypto.PrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.PrecommitData>(precommit, {
			length:
				1 + // type
				4 + // height
				4 + // round
				1 + // validatorIndex
				1 +
				(precommit.blockId ? this.hashSize : 0) + // blockId
				this.signatureSize, // signature
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
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

	public async serializePrecommitForSignature(precommit: Contracts.Crypto.SignaturePrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignaturePrecommitData>(precommit, {
			length:
				1 + // type
				4 + // height
				4 + // round
				1 +
				(precommit.blockId ? this.hashSize : 0), // blockId
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
					optional: true,
				},
			},
		});
	}

	public async serializePrevoteForSignature(prevote: Contracts.Crypto.SignaturePrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignaturePrevoteData>(prevote, {
			length:
				1 + // type
				4 + // height
				4 + // round
				1 +
				(prevote.blockId ? this.hashSize : 0), // blockId
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
					optional: true,
				},
			},
		});
	}

	public async serializePrevote(prevote: Contracts.Crypto.PrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.PrevoteData>(prevote, {
			length:
				1 + // type
				4 + // height
				4 + // round
				1 +
				(prevote.blockId ? this.hashSize : 0) + // blockId
				1 + // validatorIndex
				this.signatureSize, // signature
			skip: 0,
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
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

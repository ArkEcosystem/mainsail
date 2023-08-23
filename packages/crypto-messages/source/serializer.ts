/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IMessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.ISerializer;

	@inject(Identifiers.Cryptography.Size.Signature)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Size.SHA256)
	private readonly hashSize!: number;

	public async serializeProposal(
		proposal: Contracts.Crypto.ISerializableProposalData,
		options: Contracts.Crypto.SerializeProposalOptions,
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.ISerializableProposalData>(proposal, {
			length:
				4 + // round
				(proposal.validRound ? 5 : 1) + // validRound
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

	public async serializePrecommit(precommit: Contracts.Crypto.IPrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrecommitData>(precommit, {
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

	public async serializePrecommitForSignature(precommit: Contracts.Crypto.ISignaturePrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.ISignaturePrecommitData>(precommit, {
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

	public async serializePrevoteForSignature(prevote: Contracts.Crypto.ISignaturePrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.ISignaturePrevoteData>(prevote, {
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

	public async serializePrevote(prevote: Contracts.Crypto.IPrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrevoteData>(prevote, {
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
}

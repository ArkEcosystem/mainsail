/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IMessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "consensus")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	@inject(Identifiers.Cryptography.Size.Signature)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Size.SHA256)
	private readonly hashSize!: number;

	public async serializeProposal(
		proposal: Contracts.Crypto.IMessageSerializableProposal,
		options: Contracts.Crypto.IMessageSerializeProposalOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IMessageSerializableProposal>(
			{
				...proposal,
				type: Contracts.Crypto.MessageType.Proposal,
			} as Contracts.Crypto.IMessageSerializableProposal,
			{
				length:
					1 + // type
					4 + // height
					4 + // round
					1 + // validatorIndex
					4 +
					proposal.block.serialized.length / 2 + // serialized block
					(options.excludeSignature ? 0 : this.signatureSize), // signature
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
					validatorIndex: {
						type: "uint8",
					},
					block: {
						type: "hex",
					},
					...(options.excludeSignature
						? {}
						: {
								signature: {
									type: "signature",
								},
						  }),
				},
			},
		);
	}

	public async serializePrecommit(
		precommit: Contracts.Crypto.IMessageSerializablePrecommit,
		options: Contracts.Crypto.IMessageSerializePrecommitOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IMessageSerializablePrecommit>(
			{
				...precommit,
				type: Contracts.Crypto.MessageType.Precommit,
			} as Contracts.Crypto.IMessageSerializablePrecommit,
			{
				length:
					1 + // type
					4 + // height
					4 + // round
					1 + // validatorIndex
					this.hashSize + // blockId
					(options.excludeSignature ? 0 : this.signatureSize), // signature
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
					validatorIndex: {
						type: "uint8",
					},
					blockId: {
						type: "blockId",
						optional: true,
					},
					...(options.excludeSignature
						? {}
						: {
								signature: {
									type: "signature",
								},
						  }),
				},
			},
		);
	}

	public async serializePrevote(
		prevote: Contracts.Crypto.IMessageSerializablePrevote,
		options: Contracts.Crypto.IMessageSerializePrevoteOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IMessageSerializablePrevote>(
			{ ...prevote, type: Contracts.Crypto.MessageType.Prevote } as Contracts.Crypto.IMessageSerializablePrevote,
			{
				length:
					1 + // type
					4 + // height
					4 + // round
					1 + // validatorIndex
					this.hashSize + // blockId
					(options.excludeSignature ? 0 : this.signatureSize), // signature
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
					validatorIndex: {
						type: "uint8",
					},
					blockId: {
						type: "blockId",
						optional: true,
					},
					...(options.excludeSignature
						? {}
						: {
								signature: {
									type: "signature",
								},
						  }),
				},
			},
		);
	}
}

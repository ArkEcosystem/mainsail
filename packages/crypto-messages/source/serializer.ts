/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IMessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "consensus")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	@inject(Identifiers.Cryptography.Size.PublicKey)
	@tagged("type", "consensus")
	private readonly validatorPublicKeySize!: number;

	@inject(Identifiers.Cryptography.Size.Signature)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Size.SHA256)
	private readonly hashSize!: number;

	public async serializeProposal(
		proposal: Contracts.Crypto.IMessageSerializableProposal,
		options: Contracts.Crypto.IMessageSerializeProposalOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IMessageSerializableProposal>(proposal, {
			length:
				4 + // height
				4 + // round
				this.validatorPublicKeySize + // validator
				4 +
				proposal.block.serialized.length / 2 + // serialized block
				(options.excludeSignature ? 0 : this.signatureSize), // signature
			skip: 0,
			// TODO
			schema: {
				height: {
					type: "uint32",
					required: true,
				},
				round: {
					type: "uint32",
					required: true,
				},
				validatorPublicKey: {
					type: "publicKey",
					required: true,
				},
				signature: {
					type: "signature",
					required: !options.excludeSignature,
				},
				block: {
					type: "hex",
					required: true,
				},
			},
		});
	}

	public async serializePrecommit(
		precommit: Contracts.Crypto.IPrecommitData,
		options: Contracts.Crypto.IMessageSerializePrecommitOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrecommitData>(precommit, {
			length:
				4 + // height
				4 + // round
				this.validatorPublicKeySize + // validator
				this.hashSize + // blockId
				(options.excludeSignature ? 0 : this.signatureSize), // signature
			skip: 0,
			// TODO
			schema: {
				height: {
					type: "uint32",
					required: true,
				},
				round: {
					type: "uint32",
					required: true,
				},
				validatorPublicKey: {
					type: "publicKey",
					required: true,
				},
				signature: {
					type: "signature",
					required: !options.excludeSignature,
				},
				blockId: {
					type: "blockId",
					required: false,
				},
			},
		});
	}

	public async serializePrevote(
		prevote: Contracts.Crypto.IPrevoteData,
		options: Contracts.Crypto.IMessageSerializePrevoteOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrevoteData>(prevote, {
			length:
				4 + // height
				4 + // round
				this.validatorPublicKeySize + // validator
				this.hashSize + // blockId
				(options.excludeSignature ? 0 : this.signatureSize), // signature
			skip: 0,
			// TODO
			schema: {
				height: {
					type: "uint32",
					required: true,
				},
				round: {
					type: "uint32",
					required: true,
				},
				validatorPublicKey: {
					type: "publicKey",
					required: true,
				},
				signature: {
					type: "signature",
					required: !options.excludeSignature,
				},
				blockId: {
					type: "blockId",
					required: false,
				},
			},
		});
	}
}

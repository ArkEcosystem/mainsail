/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.IMessageDeserializer {
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

	public async deserializeProposal(serialized: Buffer): Promise<Contracts.Crypto.IProposal> {
		const proposal = {} as Contracts.Crypto.IProposal;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IProposal>(buffer, proposal, {
			length: 4 + 4 + 48 + 96,
			// TODO
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorPublicKey: {
					type: "publicKey",
				},
				signature: {
					type: "signature",
				},
				block: {
					type: "hex",
				},
			},
		});

		return proposal;
	}

	public async deserializePrecommit(serialized: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const precommit = {} as Contracts.Crypto.IPrecommit;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IPrecommit>(buffer, precommit, {
			length:
				4 + // height
				4 + // round
				this.validatorPublicKeySize + // validator
				this.hashSize + // blockId
				this.signatureSize, // signature 
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorPublicKey: {
					type: "publicKey",
				},
				signature: {
					type: "signature",
				},
				blockId: {
					type: "blockId",
				},
			},
		});

		return precommit;
	}

	public async deserializePrevote(serialized: Buffer): Promise<Contracts.Crypto.IPrevote> {
		const prevote = {} as Contracts.Crypto.IPrevote;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IPrevote>(buffer, prevote, {
			length:
				4 + // height
				4 + // round
				this.validatorPublicKeySize + // validator
				this.hashSize + // blockId
				this.signatureSize, // signature 
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorPublicKey: {
					type: "publicKey",
				},
				signature: {
					type: "signature",
				},
				blockId: {
					type: "blockId",
				},
			},
		});

		return prevote;
	}
}

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

	public async serializePrecommit(precommit: Contracts.Crypto.PrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.PrecommitData>(precommit, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 + // validatorIndex
				1 +
				(precommit.blockHash ? this.hashSize : 0) + // blockHash
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

	public async serializePrecommitForSignature(precommit: Contracts.Crypto.SignaturePrecommitData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignaturePrecommitData>(precommit, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 +
				(precommit.blockHash ? this.hashSize : 0), // blockHash
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

	public async serializePrevoteForSignature(prevote: Contracts.Crypto.SignaturePrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SignaturePrevoteData>(prevote, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 +
				(prevote.blockHash ? this.hashSize : 0), // blockHash
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

	public async serializePrevote(prevote: Contracts.Crypto.PrevoteData): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.PrevoteData>(prevote, {
			length:
				1 + // type
				4 + // blockNumber
				4 + // round
				1 +
				(prevote.blockHash ? this.hashSize : 0) + // blockHash
				1 + // validatorIndex
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
}

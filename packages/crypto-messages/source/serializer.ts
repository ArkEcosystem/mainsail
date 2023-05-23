/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Serializer implements Contracts.Crypto.IMessageSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "consensus")
	private readonly serializer: Contracts.Serializer.ISerializer;

	public async serializeProposal(
		proposal: Contracts.Crypto.IMessageSerializableProposal,
		options: Contracts.Crypto.IMessageSerializeProposalOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IMessageSerializableProposal>(proposal, {
			length: 4 + 4 + 48 + (options.excludeSignature ? 0 : 96),
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
				...(options.excludeSignature
					? {}
					: {
						signature: {
							type: "signature",
						},
					}),

				// block: {
				// 	type: "block",
				// },
			},
		});
	}

	public async serializePrecommit(
		precommit: Contracts.Crypto.IPrecommitData,
		options: Contracts.Crypto.IMessageSerializePrecommitOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrecommitData>(precommit, {
			length: 4 + 4 + 48 + 48 + (options.excludeSignature ? 0 : 96),
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
				blockId: {
					type: "publicKey",
					required: false,
				},
				...(options.excludeSignature
					? {}
					: {
						signature: {
							type: "signature",
						},
					}),
			},
		});
	}

	public async serializePrevote(
		prevote: Contracts.Crypto.IPrevoteData,
		options: Contracts.Crypto.IMessageSerializePrevoteOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.IPrevoteData>(prevote, {
			length: 4 + 4 + 48 + 48 + (options.excludeSignature ? 0 : 96),
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
				blockId: {
					type: "publicKey",
					required: false,
				},
				...(options.excludeSignature
					? {}
					: {
						signature: {
							type: "signature",
						},
					}),
			},
		});
	}
}

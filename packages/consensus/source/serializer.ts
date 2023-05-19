/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import {
	IPrecommitData,
	IPrevoteData,
	ISerializableProposal,
	ISerializePrecommitOptions,
	ISerializePrevoteOptions,
	ISerializeProposalOptions,
	ISerializer,
} from "./types";

@injectable()
export class Serializer implements ISerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer: Contracts.Serializer.ISerializer;

	public async serializeProposal(
		proposal: ISerializableProposal,
		options: ISerializeProposalOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<ISerializableProposal>(proposal, {
			length: 2_000_000,
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
								type: "hash",
							},
					  }),

				// block: {
				// 	type: "block",
				// },
			},
		});
	}

	public async serializePrecommit(
		precommit: IPrecommitData,
		options: ISerializePrecommitOptions = {},
	): Promise<Buffer> {
		return this.serializer.serialize<IPrecommitData>(precommit, {
			length: 2_000_000,
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
					type: "hash",
					required: false,
				},
				...(options.excludeSignature
					? {}
					: {
							signature: {
								type: "hash",
							},
					  }),
			},
		});
	}

	public async serializePrevote(prevote: IPrevoteData, options: ISerializePrevoteOptions = {}): Promise<Buffer> {
		return this.serializer.serialize<IPrevoteData>(prevote, {
			length: 2_000_000,
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
					type: "hash",
					required: false,
				},
				...(options.excludeSignature
					? {}
					: {
							signature: {
								type: "hash",
							},
					  }),
			},
		});
	}
}

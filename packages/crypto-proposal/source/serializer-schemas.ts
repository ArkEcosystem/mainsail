/* eslint-disable sort-keys-fix/sort-keys-fix */
import type { Contracts } from "@mainsail/contracts";

export const schemaUnsigned: Record<string, Contracts.Serializer.SerializationSchema> = {
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
};

export const schema: Record<string, Contracts.Serializer.SerializationSchema> = {
	...schemaUnsigned,
	signature: {
		type: "consensusSignature",
	},
};

export const lockProofSchema: Record<string, Contracts.Serializer.SerializationSchema> = {
	signature: {
		type: "consensusSignature",
	},
	validators: {
		type: "validatorSet",
	},
};

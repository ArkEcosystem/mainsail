import { schemas as originalSchemas } from "@mainsail/crypto-key-pair-bls12-381";

export const schemas = {
	consensusPublicKey: {
		...originalSchemas.publicKey,
		$id: "consensusPublicKey",
	},
	consensusSignature: {
		$id: "consensusSignature",
		allOf: [
			{ $ref: "alphanumeric" },
			{ minLength: 192, maxLength: 192 },
		],
		type: "string",
	}
};

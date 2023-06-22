import { schemas as originalSchemas } from "@mainsail/crypto-key-pair-bls12-381";

export const schemas = {
	consensusPublicKey: {
		...originalSchemas.publicKey,
		$id: "consensusPublicKey",
	},
	consensusSignature: {
		$id: "consensusSignature",
		allOf: [{ $ref: "alphanumeric" }, { maxLength: 192, minLength: 192 }],
		type: "string",
	},
};

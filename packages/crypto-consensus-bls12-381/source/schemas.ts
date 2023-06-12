import { schemas as originalSchemas } from "@mainsail/crypto-key-pair-bls12-381";

export const schemas = {
	publicKey: {
		...originalSchemas.publicKey,
		$id: "consensusPublicKey",
	},
};

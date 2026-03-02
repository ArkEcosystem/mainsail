
import type { Contracts } from "@mainsail/contracts";

export const schema: Record<string, Contracts.Serializer.DeserializationSchema> = {
	round: {
		type: "uint32",
	},
	signature: {
		type: "consensusSignature",
	},
	validators: {
		type: "validatorSet",
	},
};

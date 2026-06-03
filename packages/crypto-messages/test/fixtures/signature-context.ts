import type { Contracts } from "@mainsail/contracts";

export const signatureContext: Contracts.Crypto.SignatureMessageContext = {
	genesisBlockHash: "0000000000000000000000000000000000000000000000000000000000000001",
	previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000002",
};

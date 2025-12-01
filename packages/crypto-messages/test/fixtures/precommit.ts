import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { blockData } from "./block.js";

export const precommitData: Contracts.Crypto.PrecommitData = {
	blockHash: blockData.hash,
	blockNumber: 1,
	round: 1,
	signature:
		"8031c22986f2a9e6e8d7d2a90210bb8483e0cad175a35a9a7e3a880f7a383e6af06be29c06199a7f18d4f123bb8a6fd60101f3eabe387f55256b879eb654928c12968f77fdefd0f776dde1806d2865f6a8059f865108aab7e7161f18cf162ee3",
	type: Enums.Crypto.MessageType.Precommit,
	validatorIndex: 0,
};

export const serializedPrecommit =
	"0201000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97008031c22986f2a9e6e8d7d2a90210bb8483e0cad175a35a9a7e3a880f7a383e6af06be29c06199a7f18d4f123bb8a6fd60101f3eabe387f55256b879eb654928c12968f77fdefd0f776dde1806d2865f6a8059f865108aab7e7161f18cf162ee3";

export const serializedPrecommitForSignature =
	"0201000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97";

export const precommitDataNoBlock: Contracts.Crypto.PrecommitData = {
	blockHash: undefined,
	blockNumber: 1,
	round: 1,
	signature:
		"904c8055242bd7736a1cf7ce20c8fedeee5f2f8fe3f6cab6a166c36c1be0f616c2b7a333912becfa3ecb799c8cd420a012bf41018f5c52f67a2858a6d5bd016e8ef6f56a84d8a734ba6ce5f9a5260201fd9d73ce8688ff0019df2c07a1c33c4d",
	type: Enums.Crypto.MessageType.Precommit,
	validatorIndex: 0,
};

export const serializedPrecommitNoBlock =
	"0201000000010000000000904c8055242bd7736a1cf7ce20c8fedeee5f2f8fe3f6cab6a166c36c1be0f616c2b7a333912becfa3ecb799c8cd420a012bf41018f5c52f67a2858a6d5bd016e8ef6f56a84d8a734ba6ce5f9a5260201fd9d73ce8688ff0019df2c07a1c33c4d";

import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";

export const prevoteData: Contracts.Crypto.MessageData = {
	blockHash: "82139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97",
	blockNumber: 1,
	round: 1,
	signature:
		"8c5ccad95d615ec9d8cb6a79e76c725958bcf7dc589e2b60ea44e7c75b61268142bfaff306e1421291d495a0a2840ec518678f3bd80bf3b6711f411718eae97cf293517511ead1b80a9ffd5152d0d02354ee65afb7bb468717a857471993811c",
	type: Enums.Crypto.MessageType.Prevote,
	validatorIndex: 0,
};

export const serializedPrevote =
	"0101000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc9700" +
	prevoteData.signature;

export const serializedPrevoteForSignature =
	"000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020101000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97";

export const prevoteDataNoBlock: Contracts.Crypto.MessageData = {
	blockHash: undefined,
	blockNumber: 1,
	round: 1,
	signature:
		"ac0c82aaddcafa20b2e53625fcc25283a21719613808a44d4336d3f3fa7e64e93bfb0e023faab69b50a1d175a8546fe4063be38390704cec107975a6f1f29550bb5ab57aa521037f0d13327add15120a8a93101ff2661e7329092b6bd581e892",
	type: Enums.Crypto.MessageType.Prevote,
	validatorIndex: 0,
};

export const serializedPrevoteNoBlock =
	"01010000000100000000" + "00" + prevoteDataNoBlock.signature;

export const serializedPrevoteNoBlockForSignature =
	"0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000201010000000100000000";

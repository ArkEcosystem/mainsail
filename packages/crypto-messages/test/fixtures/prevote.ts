import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { blockData } from "./block.js";

export const prevoteData: Contracts.Crypto.PrevoteData = {
	blockHash: blockData.hash,
	blockNumber: 1,
	round: 1,
	signature:
		"a25c6d7a0491513cecaabe83f9c1dc59d5d9750a09535fd7d2eb4a81641a425a664c41822c1ba0d414357ad34a8f0a5a084d269f04e8c09da20b44ff75d1a0280919a31d2a519bf0327459471fda97f8a1096500ec84a5b2004eff1dc719de77",
	type: Enums.Crypto.MessageType.Prevote,
	validatorIndex: 0,
};

export const serializedPrevote =
	"0101000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc9700a25c6d7a0491513cecaabe83f9c1dc59d5d9750a09535fd7d2eb4a81641a425a664c41822c1ba0d414357ad34a8f0a5a084d269f04e8c09da20b44ff75d1a0280919a31d2a519bf0327459471fda97f8a1096500ec84a5b2004eff1dc719de77";

export const serializedPrevoteForSignature =
	"0101000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97";

export const prevoteDataNoBlock: Contracts.Crypto.PrevoteData = {
	blockHash: undefined,
	blockNumber: 1,
	round: 1,
	signature:
		"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
	type: Enums.Crypto.MessageType.Prevote,
	validatorIndex: 0,
};

export const serializedPrevoteNoBlock =
	"0101000000010000000000927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038";

import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";

export const precommitData: Contracts.Crypto.MessageData = {
	blockHash: "82139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97",
	blockNumber: 1,
	round: 1,
	signature:
		"b658a847f5a58b461919610c1097af52c0386e659f3a27bbf6f917bcd037e654e6d899921b42ab65ff304e29dab2c43c05e38a49842f456d7a842d83e0bb3c48cb63ff1dcc913c6c61101489917720e6ca21a61166b9d43a0636bf467b75958b",
	type: Enums.Crypto.MessageType.Precommit,
	validatorIndex: 0,
};

export const serializedPrecommit =
	"0201000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc9700" +
	precommitData.signature;

export const serializedPrecommitForSignature =
	"000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020201000000010000000182139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97";

export const precommitDataNoBlock: Contracts.Crypto.MessageData = {
	blockHash: undefined,
	blockNumber: 1,
	round: 1,
	signature:
		"936e9fcbb2dc4a1d2b3032eadeb6c8e805f2fc6e5f80035cf8284fca08fe121dc767ca53f56b91212b7b0e1d5e0c8d9213d1de95d760510a0d8894786316b2fce0df4db7a4de3ebec9c36716eea0baf2d6d4fd5c265d3d6e96fb281f95e954fa",
	type: Enums.Crypto.MessageType.Precommit,
	validatorIndex: 0,
};

export const serializedPrecommitNoBlock =
	"02010000000100000000" + "00" + precommitDataNoBlock.signature;

export const serializedPrecommitNoBlockForSignature =
	"0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000202010000000100000000";

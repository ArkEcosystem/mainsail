import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const blockData: Contracts.Crypto.IBlockData = {
	generatorPublicKey: "e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9",
	height: 2,
	id: "e6ece29ff55b818dd22f1c2b2c420b374d8b9ce4a9e602816cab6d08ee754ca7",
	numberOfTransactions: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	payloadLength: 0,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	reward: BigNumber.ZERO,
	timestamp: 0,
	totalAmount: BigNumber.ZERO,
	totalFee: BigNumber.ZERO,
	transactions: [],
	version: 1,
};

export const blockDataJson: Contracts.Crypto.IBlockJson = {
	generatorPublicKey: "e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9",
	height: 2,
	id: "e6ece29ff55b818dd22f1c2b2c420b374d8b9ce4a9e602816cab6d08ee754ca7",
	numberOfTransactions: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	payloadLength: 0,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	reward: "0",
	timestamp: 0,
	totalAmount: "0",
	totalFee: "0",
	transactions: [],
	version: 1,
};

export const serialized =
	"01000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9";

export const blockDataWithTransactions: Contracts.Crypto.IBlockData = {
	generatorPublicKey: "e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9",
	height: 2,
	id: "d1c09a297ea886d281377c5240bca65bbbaebabd78556f1cfad6d37e07fa39a8",
	numberOfTransactions: 2,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	payloadLength: 186 * 2 + 8,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	reward: BigNumber.make(3),
	timestamp: 0,
	totalAmount: BigNumber.make(3),
	totalFee: BigNumber.ZERO,
	transactions: [
		{
			amount: BigNumber.ONE,
			expiration: 0,
			fee: BigNumber.ONE,
			id: "69d2e1503ca29bad075dbb5b9eb703ce83eb2def1ae69d798f3ea6020628a774",
			nonce: BigNumber.ZERO,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			signature:
				"ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5c",
			timestamp: 0,
			type: 0,
			typeGroup: 1,
			version: 1,
		},
		{
			amount: BigNumber.ONE,
			expiration: 0,
			fee: BigNumber.ONE,
			id: "db752428baf39c66bd509769df2fc97c741ad205191f6029c109c7a832c8ab5b",
			nonce: BigNumber.ZERO,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			timestamp: 0,
			type: 0,
			typeGroup: 1,
			version: 1,
		},
	],
	version: 1,
};

export const blockDataWithTransactionsJson: Contracts.Crypto.IBlockJson = {
	generatorPublicKey: "e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9",
	height: 2,
	id: "d1c09a297ea886d281377c5240bca65bbbaebabd78556f1cfad6d37e07fa39a8",
	numberOfTransactions: 2,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	payloadLength: 0,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	reward: "3",
	timestamp: 0,
	totalAmount: "3",
	totalFee: "0",
	transactions: [
		{
			amount: "1",
			expiration: 0,
			fee: "1",
			id: "69d2e1503ca29bad075dbb5b9eb703ce83eb2def1ae69d798f3ea6020628a774",
			nonce: "0",
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			signature:
				"ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5c",
			timestamp: 0,
			type: 0,
			typeGroup: 1,
			version: 1,
		},
		{
			amount: "1",
			expiration: 0,
			fee: "1",
			id: "db752428baf39c66bd509769df2fc97c741ad205191f6029c109c7a832c8ab5b",
			nonce: "0",
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			timestamp: 0,
			type: 0,
			typeGroup: 1,
			version: 1,
		},
	],
	version: 1,
};

export const serializedWithTransactions =
	"01000000000000000200000000000000000000000000000000000000000000000000000000000000000000000200000003000000000000000000000000000000030000000000000000000000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e012f0a7cac12a74bdc17d844cbc9f637177b470019c32a53cef94c7a56e2ea9ba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8";

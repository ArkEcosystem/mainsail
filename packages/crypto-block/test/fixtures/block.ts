import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const blockData: Contracts.Crypto.BlockData = {
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 0,
	totalAmount: BigNumber.ZERO,
	totalFee: BigNumber.ZERO,
	reward: BigNumber.ZERO,
	payloadLength: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "2a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9d",
	id: "7a00f61b597789dca2f3d6e411625ee9473d2cd38724c49741810fdf003c34f1",
	transactions: [],
};

export const blockDataJson: Contracts.Crypto.BlockJson = {
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 0,
	totalAmount: "0",
	totalFee: "0",
	reward: "0",
	payloadLength: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "2a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9d",
	id: "7a00f61b597789dca2f3d6e411625ee9473d2cd38724c49741810fdf003c34f1",
	transactions: [],
};

export const serialized =
	"0174ba618a8c0102000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8552a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9d";

export const blockDataWithTransactions: Contracts.Crypto.BlockData = {
	id: "3b76ae07ded37bbab2d56302f7ab09f302ec1a815a53c80ee9805d9c8c8eca19",
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 2,
	totalAmount: BigNumber.make(2),
	totalFee: BigNumber.make(2),
	reward: BigNumber.ZERO,
	payloadLength: 388,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "2a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9d",
	transactions: [
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: BigNumber.ZERO,
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			fee: BigNumber.ONE,
			amount: BigNumber.ONE,
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5c",
			id: "69d2e1503ca29bad075dbb5b9eb703ce83eb2def1ae69d798f3ea6020628a774",
			sequence: 0,
			timestamp: 1703128709748,
		},
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: BigNumber.ZERO,
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			fee: BigNumber.ONE,
			amount: BigNumber.ONE,
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			id: "db752428baf39c66bd509769df2fc97c741ad205191f6029c109c7a832c8ab5b",
			sequence: 1,
			timestamp: 1703128709748,
		},
	],
};

export const blockDataWithTransactionsJson: Contracts.Crypto.BlockJson = {
	id: "3b76ae07ded37bbab2d56302f7ab09f302ec1a815a53c80ee9805d9c8c8eca19",
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 2,
	totalAmount: "2",
	totalFee: "2",
	reward: "0",
	payloadLength: 388,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "2a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9d",
	transactions: [
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: "0",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			fee: "1",
			amount: "1",
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5c",
			id: "69d2e1503ca29bad075dbb5b9eb703ce83eb2def1ae69d798f3ea6020628a774",
			sequence: 0,
			timestamp: 1703128709748,
		},
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: "0",
			senderPublicKey: "287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			fee: "1",
			amount: "1",
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			id: "db752428baf39c66bd509769df2fc97c741ad205191f6029c109c7a832c8ab5b",
			sequence: 1,
			timestamp: 1703128709748,
		},
	],
};

export const serializedWithTransactions =
	"0174ba618a8c0102000000010000000000000000000000000000000000000000000000000000000000000000000000020002000000000000000200000000000000000000000000000084010000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8552a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9dba00ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba00ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8000000000000000000000000";

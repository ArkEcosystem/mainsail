import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const blockData: Contracts.Crypto.IBlockData = {
	id: "de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a",
	version: 1,
	timestamp: 1686194628,
	height: 2,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 2,
	totalAmount: BigNumber.make("2"),
	totalFee: BigNumber.make("2"),
	reward: BigNumber.ZERO,
	payloadLength: 380,
	payloadHash: "fb4b688d26293c5c24ef9c42d325283c67e2016c841d7ad35d4b887a423c28b0",
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
			timestamp: 1686194628,
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
			timestamp: 1686194628,
		},
	],
};

export const serializedBlock =
	"01000000c4498164020000000000000000000000000000000000000000000000000000000000000000000000020000000200000000000000020000000000000000000000000000007c010000fb4b688d26293c5c24ef9c42d325283c67e2016c841d7ad35d4b887a423c28b02a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9dba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd800000000000000000000000000000000";

export const proposalData: Contracts.Crypto.IProposalData = {
	round: 1,
	validatorPublicKey:
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	signature:
		"a46860c81f6530994fa6e23d513dec7a377926db8798916aee1f9d05ed29f00e8560e1c5a5e4860f6b6aca2f1fc2f92f142ac71a82696d889365f1e06bb68b78dc2e762b5811f6646abffc1b566d00efb80be1027904379e057e0806091c0622",
	height: 1,
	block: {
		header: { ...blockData },
		serialized: serializedBlock,
		transactions: [],
		data: blockData,
	},
};

export const serializedProposal =
	"010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb1802000001000000c4498164020000000000000000000000000000000000000000000000000000000000000000000000020000000200000000000000020000000000000000000000000000007c010000fb4b688d26293c5c24ef9c42d325283c67e2016c841d7ad35d4b887a423c28b02a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9dba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd800000000000000000000000000000000a46860c81f6530994fa6e23d513dec7a377926db8798916aee1f9d05ed29f00e8560e1c5a5e4860f6b6aca2f1fc2f92f142ac71a82696d889365f1e06bb68b78dc2e762b5811f6646abffc1b566d00efb80be1027904379e057e0806091c0622";

export const precommitData: Contracts.Crypto.IPrecommitData = {
	round: 1,
	validatorPublicKey:
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	signature:
		"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
	height: 1,
	blockId: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34",
};

export const serializedPrecommit =
	"010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03";

export const precommitDataNoBlock: Contracts.Crypto.IPrecommitData = {
	round: 1,
	validatorPublicKey:
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	signature:
		"8c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0",
	height: 1,
	blockId: undefined,
};

export const serializedPrecommitNoBlock =
	"010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb00000000000000000000000000000000000000000000000000000000000000008c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0";

export const prevoteData: Contracts.Crypto.IPrevoteData = {
	round: 1,
	validatorPublicKey:
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	signature:
		"b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03",
	height: 1,
	blockId: "95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34",
};

export const serializedPrevote =
	"010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34b22317bfdb10ba592724c27d0cdc51378e5cd94a12cd7e85c895d2a68e8589e8d3c5b3c80f4fe905ef67aa7827617d04110c5c5248f2bb36df97a58c541961ed0f2fcd0760e9de5ae1598f27638dd3ddaebeea08bf313832a57cfdb7f2baaa03";

export const prevoteDataNoBlock: Contracts.Crypto.IPrevoteData = {
	round: 1,
	validatorPublicKey:
		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	signature:
		"8c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0",
	height: 1,
	blockId: undefined,
};

export const serializedPrevoteNoBlock =
	"010000000100000095af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb00000000000000000000000000000000000000000000000000000000000000008c32ffc4d5fe8aa9a3b3a5623c1b805a50095bc5b53940abc62d22f84e55fab406ba530b3dc3d8082ed9bec0c660094a010c2320e5a201612b9fbac78b0d2664b3e7bc1e4442734ab8a3fc378567c0d8109ba0192da90c6faaa0e215be842ee0";

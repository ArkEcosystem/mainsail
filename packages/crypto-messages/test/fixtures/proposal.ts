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
	validatorIndex: 0,
	signature:
		"ae36d806363e1ca73c6e2f01f78db9e14557ba1a18678e2d1e564db154da2c084187696d96d4ee365f52d7b991c428430aa15f9360a4b5906c13e2608e0a064d9bf35752e79a9fc1f8147a8b01e1927314cb12db96ef5c4bf27f3fe5c9b7325a",
	height: 1,
	block: {
		header: { ...blockData },
		serialized: serializedBlock,
		transactions: [],
		data: blockData,
	},
};

export const serializedProposal =
	"0100000001000000001802000001000000c4498164020000000000000000000000000000000000000000000000000000000000000000000000020000000200000000000000020000000000000000000000000000007c010000fb4b688d26293c5c24ef9c42d325283c67e2016c841d7ad35d4b887a423c28b02a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9dba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd800000000000000000000000000000000ae36d806363e1ca73c6e2f01f78db9e14557ba1a18678e2d1e564db154da2c084187696d96d4ee365f52d7b991c428430aa15f9360a4b5906c13e2608e0a064d9bf35752e79a9fc1f8147a8b01e1927314cb12db96ef5c4bf27f3fe5c9b7325a";

export const serializedProposalWithoutSignature =
	"0100000001000000001802000001000000c4498164020000000000000000000000000000000000000000000000000000000000000000000000020000000200000000000000020000000000000000000000000000007c010000fb4b688d26293c5c24ef9c42d325283c67e2016c841d7ad35d4b887a423c28b02a453fefde568a298d26d4a3eaa66585ce6652d0dc59bd955be40746f7197a9dba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5cba000000ff011e0100000000000000000000000000287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3701000000000000000001000000000000000000000005011d1f1d0e1d04181e0401140108090e051f07030c1a0b0c0f19111c100002031019011f020d0e00131c041719161615101b10ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd800000000000000000000000000000000";

export const precommitData: Contracts.Crypto.IPrecommitData = {
	round: 1,
	validatorIndex: 0,
	signature:
		"8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63",
	height: 1,
	blockId: blockData.id,
};

export const serializedPrecommit =
	"010000000100000000de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63";

export const serializedPrecommitWithoutSignature =
	"010000000100000000de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a";

export const precommitDataNoBlock: Contracts.Crypto.IPrecommitData = {
	round: 1,
	validatorIndex: 0,
	signature:
		"a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae",
	height: 1,
	blockId: undefined,
};

export const serializedPrecommitNoBlock =
	"0100000001000000000000000000000000000000000000000000000000000000000000000000000000a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae";

export const prevoteData: Contracts.Crypto.IPrevoteData = {
	round: 1,
	validatorIndex: 0,
	signature:
		"8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63",
	height: 1,
	blockId: blockData.id,
};

export const serializedPrevote =
	"010000000100000000de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a8b3721603129afea5e6aa7e4201875b070228decfcba8acdd89d94066caddcc62e516d2f0502d910af9128d722b16c141489d765e7c7388fdcdc7932f25fd4e32a55cdf02c2ba1f35fec306873ed25c7b139656deac0a9f73608569cec3c0a63";

export const serializedPrevoteWithoutSignature =
	"010000000100000000de6fbaaf4535dee0e243d455793a0f869a5af59de7989271d45583df5f710e8a";

export const prevoteDataNoBlock: Contracts.Crypto.IPrevoteData = {
	round: 1,
	validatorIndex: 0,
	signature:
		"a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae",
	height: 1,
	blockId: undefined,
};

export const serializedPrevoteNoBlock =
	"0100000001000000000000000000000000000000000000000000000000000000000000000000000000a306c92bc07dbb276d7f6ed586fface06f5e2a4f19789062fd7884d15b05ce7ba4fdc94eb996c25eb911940376cf94f4112ec60e168d40b7874cbf362a55162348def985b6b499b9b06d08d6d262a343f9a08a5026ad979632ee9c5c894e24ae";

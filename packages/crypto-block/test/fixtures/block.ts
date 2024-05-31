import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const blockData: Contracts.Crypto.BlockData = {
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 0,
	totalGas: 0,
	totalAmount: BigNumber.ZERO,
	totalFee: BigNumber.ZERO,
	reward: BigNumber.ZERO,
	payloadLength: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "02b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a",
	id: "6fcb5df2fca0ccb57b042316fedd5f641d5876ac04ffc871be23b7623ebb94cc",
	transactions: [],
};

export const blockDataJson: Contracts.Crypto.BlockJson = {
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 0,
	totalGas: 0,
	totalAmount: "0",
	totalFee: "0",
	reward: "0",
	payloadLength: 0,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "02b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a",
	id: "6fcb5df2fca0ccb57b042316fedd5f641d5876ac04ffc871be23b7623ebb94cc",
	transactions: [],
};

export const serialized =
	"0174ba618a8c010200000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85502b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a";

export const blockDataWithTransactions: Contracts.Crypto.BlockData = {
	id: "b05832374b8f194cd212974d9f9a83498bb31701fbbac234072ef14d3229244c",
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 2,
	totalGas: 10_000_000,
	totalAmount: BigNumber.make(2),
	totalFee: BigNumber.make(2),
	reward: BigNumber.ZERO,
	payloadLength: 388,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "02b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a",
	transactions: [
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: BigNumber.ZERO,
			senderPublicKey: "03c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e",
			fee: BigNumber.ONE,
			amount: BigNumber.ONE,
			expiration: 0,
			recipientId: "0x6AF8064dDb3Fbbb3D1a0c73603931328673D7465",
			signature:
				"6198845e70fc56c3598027a3877a1d8549d2aa1304fe59188690a81fd18f8db885ef5ee2ee7ce8cb9d89642399fb3b0b8f00209297b0e877ce2b069006dcb7f8",
			id: "877a4ebf24c5863317d0bddbdd69b0a3b7e527b3c69bb963052c9cabbaf8219f",
			sequence: 0,
			timestamp: 1703128709748,
		},
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: BigNumber.ZERO,
			senderPublicKey: "03c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e",
			fee: BigNumber.ONE,
			amount: BigNumber.ONE,
			expiration: 0,
			recipientId: "0x6AF8064dDb3Fbbb3D1a0c73603931328673D7465",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			id: "725325cb00a762bad9662ac5fe30cf1905863aa9495c471e4dac39fe568a91f3",
			sequence: 1,
			timestamp: 1703128709748,
		},
	],
};

export const blockDataWithTransactionsJson: Contracts.Crypto.BlockJson = {
	id: "b05832374b8f194cd212974d9f9a83498bb31701fbbac234072ef14d3229244c",
	version: 1,
	timestamp: 1703128709748,
	height: 2,
	round: 1,
	previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
	numberOfTransactions: 2,
	totalGas: 10_000_000,
	totalAmount: "2",
	totalFee: "2",
	reward: "0",
	payloadLength: 388,
	payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	generatorPublicKey: "02b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a",
	transactions: [
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: "0",
			senderPublicKey: "03c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e",
			fee: "1",
			amount: "1",
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ef4c4e285824ee65dee3f0652282fee31b02849cb221b6de18f28c648a7c5dcba2a97a1d210974cd4129cc925657993e12cdfe0b36a487cc4d2f886a09e33a5c",
			id: "877a4ebf24c5863317d0bddbdd69b0a3b7e527b3c69bb963052c9cabbaf8219f",
			sequence: 0,
			timestamp: 1703128709748,
		},
		{
			version: 1,
			network: 30,
			typeGroup: 1,
			type: 0,
			nonce: "0",
			senderPublicKey: "03c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e",
			fee: "1",
			amount: "1",
			expiration: 0,
			recipientId: "ark19palawayc7yp5pgfw9l8rv6tv0e3usqzrseplzdwqnuyhekk4smskdkz3s",
			signature:
				"ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd8",
			id: "725325cb00a762bad9662ac5fe30cf1905863aa9495c471e4dac39fe568a91f3",
			sequence: 1,
			timestamp: 1703128709748,
		},
	],
};

export const serializedWithTransactions =
	"0174ba618a8c010200000001000000000000000000000000000000000000000000000000000000000000000000000002008096980002000000000000000200000000000000000000000000000084010000e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85502b7faa9f46f198fee18c4b058b3c71fae66d35f3842a0288627c6123a79f1f36a9b00ff011e010000000000000000000000000003c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e0100000000000000000100000000000000000000006af8064ddb3fbbb3d1a0c73603931328673d74656198845e70fc56c3598027a3877a1d8549d2aa1304fe59188690a81fd18f8db885ef5ee2ee7ce8cb9d89642399fb3b0b8f00209297b0e877ce2b069006dcb7f89b00ff011e010000000000000000000000000003c0c38f1b75046b3f2bf58cb5c557722c23e310b74a899d61f56e593cddaab12e0100000000000000000100000000000000000000006af8064ddb3fbbb3d1a0c73603931328673d7465ff8e1b3862ebde59bc77394ea7c0e4afe20b1129faa3afa86fc936c8d172a3bff17034515e5b286dac0f27475b69808aff39ce6a0683a8768db088609a0bffd80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

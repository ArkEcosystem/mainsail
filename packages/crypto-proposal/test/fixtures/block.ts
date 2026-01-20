import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export const validatorMnemonic =
	"sudden head royal retire duck discover danger then basic rice wish left whip chronic enrich sun behind idea remind retire coyote select goddess exile";

export const blockHeader: Contracts.Crypto.BlockHeader = {
	fee: BigNumber.make("10000000000"),
	gasUsed: 2000,
	hash: "82139a7708157c8e2b78f0db38216924c8a17f82e77d5997fb280b1435a6cc97",
	logsBloom:
		"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
	number: 2,
	parentHash: "0000000000000000000000000000000000000000000000000000000000000000",
	payloadSize: 226,
	proposer: "0xB559F4FbB75c378CDd3Dd7CcbFeff9c5c2094E55",
	reward: BigNumber.ZERO,
	round: 1,
	stateRoot: "0000000000000000000000000000000000000000000000000000000000000000",
	timestamp: 1703128709748,
	transactionsCount: 2,
	transactionsRoot: "f01a3a2a2990990a64211feb47e2fa25c048decb3420ee52562fdc4931225c0f",
	version: 1,
};

export const blockData: Contracts.Crypto.BlockData = {
	...blockHeader,
	transactions: [
		{
			data: "",
			from: "0xE33074cBE63A1f86cc8EAb97b2099732F15284fE",
			gasLimit: 1_000_000,
			gasPrice: 5_000_000_000,
			hash: "65d43d2bed464b6bb1df8d6c0136316d3a3559569904fb16d5e3a8d71ebc2ebc",
			network: 10_000,
			nonce: BigNumber.ZERO,
			r: "921101a4583fb153ec00e501f3c2e2636114e1c8c58d2df8a19426cc066a6768",
			s: "22db4bce1e0ace485ce0838d178b4d5bcfa9f69b315a14c580d9b01e5c980bdd",
			senderLegacyAddress: "DUQKzkR4BP5UcWayJMpRXtpEXuw4zPbWhe",
			senderPublicKey: "02daa6f404dbd49c9c74a3d88d65b967a9b51d3465c92833e8e2ede11e7242f014",
			to: "0xBe89811e15f611C1db12e59679b6F3DC1F430155",
			transactionIndex: 0,
			v: 0,
			value: BigNumber.ZERO,
		},
		{
			data: "",
			from: "0x8ae872F64bA0731f66F847f4e8Fc0796dF0bCc08",
			gasLimit: 1_000_000,
			gasPrice: 5_000_000_000,
			hash: "7a74379424e07173c137dd89c29f497b35d8013815b03096b51e67f87c453574",
			network: 10_000,
			nonce: BigNumber.ONE,
			r: "6c9842bc78c2f68468cbf8a8f3fec0ae2679707ffb606a4b373dd01a02af55fc",
			s: "1a4c4d984d750678fb204ce8b7e97d860c974ac1a423f098dc4921acd2be0c7d",
			senderLegacyAddress: "DQJTK7of6bPUfJEuL9gUV4qnUyq72eskKe",
			senderPublicKey: "03043bfdf530d59e919323a33d0c8f5ca43f6b50dfe753c9b3e987a4a5233a2a15",
			to: "0xBe89811e15f611C1db12e59679b6F3DC1F430155",
			transactionIndex: 1,
			v: 0,
			value: BigNumber.ZERO,
		},
	],
};

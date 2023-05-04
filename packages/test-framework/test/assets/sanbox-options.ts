import { SandboxOptions } from "../../source";

export const sandboxOptions: SandboxOptions = {
	core: {
		app: {},
		environment: { TEST: "test" },
		peers: {},
		validators: {},
	},
	crypto: {
		flags: {
			blockTime: 8,
			distribute: true,
			explorer: "http://uexplorer.ark.io",
			maxBlockPayload: 2_097_152,
			maxTxPerBlock: 150,
			network: "unitnet",
			premine: "15300000000000000",
			pubKeyHash: 23,
			rewardAmount: 200_000_000,
			rewardHeight: 75_600,
			symbol: "UѦ",
			token: "UARK",
			validators: 51,
			wif: 186,
		},
		genesisBlock: {},
		milestones: {},
		network: {},
	},
};

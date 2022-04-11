import { Constants } from "@arkecosystem/core-contracts";

export const defaults = {
	storage: {
		maxLastBlocks: 100,
		maxLastTransactionIds: 10_000,
	},
	walletSync: {
		enabled: !!process.env[Constants.Flags.CORE_WALLET_SYNC_ENABLED],
	},
};

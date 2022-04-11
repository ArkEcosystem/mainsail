import { Constants } from "@arkecosystem/core-contracts";

export const defaults = {
	fileRotator: {
		interval: "1d",
	},
	levels: {
		console: process.env[Constants.Flags.CORE_LOG_LEVEL] || "info",
		file: process.env[Constants.Flags.CORE_LOG_LEVEL_FILE] || "debug",
	},
};

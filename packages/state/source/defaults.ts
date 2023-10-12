import { Constants } from "@mainsail/contracts";

export const defaults = {
	export: {
		enabled: !process.env[Constants.Flags.CORE_STATE_EXPORT_DISABLED],
		interval: process.env[Constants.Flags.CORE_STATE_EXPORT_INTERVAL] || 1000, // Blocks
		retainFiles: process.env[Constants.Flags.CORE_STATE_EXPORT_RETAIN_FILES] || 2, // Files
	},
};

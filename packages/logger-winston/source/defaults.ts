import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	levels: {
		console: Environment.get(Constants.Flags.CORE_LOG_LEVEL, "info"),
		file: Environment.get(Constants.Flags.CORE_LOG_LEVEL_FILE, "debug"),
	},
};

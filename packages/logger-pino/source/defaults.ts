import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	fileRotator: {
		interval: "1d",
	},
	levels: {
		console: Environment.get(Constants.EnvironmentVariables.CORE_LOG_LEVEL, "info"),
		file: Environment.get(Constants.EnvironmentVariables.CORE_LOG_LEVEL_FILE, "debug"),
	},
};

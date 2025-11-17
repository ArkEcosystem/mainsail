import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	fileRotator: {
		interval: "1d",
	},
	levels: {
		console: Environment.get(EnvironmentVariables.MAINSAIL_LOG_LEVEL, "info"),
		file: Environment.get(EnvironmentVariables.MAINSAIL_LOG_LEVEL_FILE, "debug"),
	},
};

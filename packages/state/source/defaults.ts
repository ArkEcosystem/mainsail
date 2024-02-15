import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	export: {
		enabled: !Environment.isTrue(Constants.EnvironmentVariables.CORE_STATE_EXPORT_DISABLED), // Enabled by default
		interval: Environment.get(Constants.EnvironmentVariables.CORE_STATE_EXPORT_INTERVAL, 1000), // Blocks
		retainFiles: Environment.get(Constants.EnvironmentVariables.CORE_STATE_EXPORT_RETAIN_FILES, 2), // Files
	},
};

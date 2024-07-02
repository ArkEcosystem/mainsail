import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	snapshots: {
		enabled: !Environment.isTrue(Constants.EnvironmentVariables.CORE_STATE_SNAPSHOTS_DISABLED), // Enabled by default
		interval: Environment.get(Constants.EnvironmentVariables.CORE_STATE_SNAPSHOTS_INTERVAL, 1000), // Blocks
		retainFiles: Environment.get(Constants.EnvironmentVariables.CORE_STATE_SNAPSHOTS_RETAIN_FILES, 2), // Files
		skipUnknownAttributes: false, // Skip unknown attributes for transaction pool snapshots
	},
};

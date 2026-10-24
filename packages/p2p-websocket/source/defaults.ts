import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	logger: {
		// Transport-level logging (connections accepted, rejected and closed). Off unless debugging.
		enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_P2P_WEBSOCKET_LOGGER_ENABLED),
	},
};

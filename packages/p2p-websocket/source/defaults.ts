import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	logger: {
		// Transport-level logging (connections accepted, rejected and closed). Off unless debugging.
		enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_P2P_WEBSOCKET_LOGGER_ENABLED),
	},
	server: {
		hostname: Environment.get(EnvironmentVariables.MAINSAIL_P2P_HOST, "0.0.0.0"),
		// Inbound connections accepted at once; a further one is refused as full. Connections we dialed
		// do not count.
		maxInboundConnections: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_CONNECTIONS, 500),
		port: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PORT, 4002),
	},
};

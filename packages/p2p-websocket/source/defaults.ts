import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	logger: {
		// Transport-level logging (connections accepted, rejected and closed). Off unless debugging.
		enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_P2P_WEBSOCKET_LOGGER_ENABLED),
	},
	server: {
		hostname: Environment.get(EnvironmentVariables.MAINSAIL_P2P_HOST, "0.0.0.0"),
		// Connections others opened to us, and connections we dialed, that may exist at once. Each side
		// has its own limit: a further inbound socket is refused as full, a further dial is not made.
		maxInboundConnections: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_INBOUND_CONNECTIONS, 50),
		maxOutboundConnections: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_OUTBOUND_CONNECTIONS, 50),
		port: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PORT, 4002),
	},
};

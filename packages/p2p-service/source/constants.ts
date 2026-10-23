import { Units } from "@mainsail/constants";

// Protocol values shared by every node; not operator configuration.
export const constants = {
	HANDSHAKE_TIMEOUT: 5000,
	MAX_PAYLOAD: 3 * Units.MEGABYTE,
	PROTOCOL_VERSION: 1,
};

import { Units } from "@mainsail/constants";

export const constants = {
	// Time allowed for the hello exchange after the socket is open.
	HANDSHAKE_TIMEOUT: 5000,
	// Largest frame accepted on an inbound socket.
	MAX_PAYLOAD: 3 * Units.MEGABYTE,
	// Version of the frame format in message.ts; bump it whenever the format changes.
	PROTOCOL_VERSION: 1,
};

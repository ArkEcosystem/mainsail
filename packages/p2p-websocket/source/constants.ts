import { Units } from "@mainsail/constants";

export const constants = {
	// Time allowed for the TCP connection and the HTTP upgrade of an outbound socket.
	CONNECT_TIMEOUT: 5000,
	// Time allowed for the hello exchange after the socket is open.
	HANDSHAKE_TIMEOUT: 5000,
	// Longest request path on the wire, in bytes.
	MAX_PATH_LENGTH: 100,
	// Largest frame accepted on an inbound socket.
	MAX_PAYLOAD: 3 * Units.MEGABYTE,
	// Version of the frame format in message.ts; bump it whenever the format changes.
	PROTOCOL_VERSION: 1,
	// Time a request waits for its response before failing.
	REQUEST_TIMEOUT: 10_000,
};

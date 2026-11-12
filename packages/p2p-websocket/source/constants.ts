import { Units } from "@mainsail/constants";

export const constants = {
	// Time allowed for the TCP connection and the HTTP upgrade of an outbound socket.
	CONNECT_TIMEOUT: 5000,
	// Two peers dialing each other at once each refuse the other's socket as a duplicate and both dials
	// fail. A dial refused that way is retried once after a random pause, so one side goes first.
	DIAL_RETRY_MAX_DELAY: 1000,
	DIAL_RETRY_MIN_DELAY: 200,
	// Time allowed for the hello exchange after the socket is open.
	HANDSHAKE_TIMEOUT: 5000,
	// An open connection is pinged this often; a ping that is still unanswered at the next one closes it.
	HEARTBEAT_INTERVAL: 10_000,
	// Longest request path on the wire, in bytes.
	MAX_PATH_LENGTH: 100,
	// Largest frame accepted on an inbound socket.
	MAX_PAYLOAD: 3 * Units.MEGABYTE,
	// Version of the frame format in message.ts; bump it whenever the format changes.
	PROTOCOL_VERSION: 1,
	// Time a request waits for its response before failing.
	REQUEST_TIMEOUT: 10_000,
};

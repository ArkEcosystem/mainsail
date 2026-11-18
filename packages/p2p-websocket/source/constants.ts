import { Units } from "@mainsail/constants";

export const constants = {
	// Time a graceful close waits for the peer's closing handshake before the socket is destroyed; ws
	// itself would wait 30 s, which holds the address in the repository for as long on a dead link.
	CLOSE_TIMEOUT: 2000,
	// Time allowed for the TCP connection and the HTTP upgrade of an outbound socket.
	CONNECT_TIMEOUT: 5000,
	// Two peers dialing each other at once each refuse the other's socket as a duplicate and both dials
	// fail. A dial refused that way is retried once after a random pause, so one side goes first.
	DIAL_RETRY_MAX_DELAY: 1000,
	DIAL_RETRY_MIN_DELAY: 200,
	// Time allowed for the hello exchange after the socket is open.
	HANDSHAKE_TIMEOUT: 5000,
	// The dialer pings an open connection this often and fails once a ping waited HEARTBEAT_TIMEOUT for
	// its pong. The acceptor expects a ping at least every HEARTBEAT_TIMEOUT, and no more than
	// HEARTBEAT_MAX_PINGS within one HEARTBEAT_TIMEOUT: twice what a dialer on the beat sends, so pings
	// bunched up by a retransmit pass while a flood does not.
	HEARTBEAT_INTERVAL: 10_000,
	HEARTBEAT_MAX_PINGS: 4,
	HEARTBEAT_TIMEOUT: 20_000,
	// Longest request path on the wire, in bytes.
	MAX_PATH_LENGTH: 100,
	// Largest frame accepted on an inbound socket.
	MAX_PAYLOAD: 3 * Units.MEGABYTE,
	// Requests from one peer that may be in progress at once. Well above what an honest peer sends:
	// consensus posts a few per round and the downloaders request one batch at a time. The same limit
	// applies to what we send; beyond it our own requests wait, up to MAX_QUEUED_REQUESTS of them.
	MAX_QUEUED_REQUESTS: 64,
	MAX_REQUESTS_IN_FLIGHT: 32,
	// Version of the wire protocol: the frame format in message.ts and the set of route paths. Bump it
	// whenever either changes; a request for an unknown path ends the connection.
	PROTOCOL_VERSION: 1,
	// Time a request waits for its response before failing, unless the request names its own. A request
	// that times out closes the connection.
	REQUEST_TIMEOUT: 5000,
};

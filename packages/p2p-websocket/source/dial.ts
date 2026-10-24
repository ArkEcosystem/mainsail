import WebSocket from "ws";

import { Connection } from "./connection.js";
import { constants } from "./constants.js";
import { Direction } from "./enums.js";

// Opens an outbound socket, runs the handshake and returns an open connection.
// The connection takes the socket while it is still connecting so no frame is missed.
export const dial = async (url: string): Promise<Connection> => {
	const ws = new WebSocket(url, {
		handshakeTimeout: constants.CONNECT_TIMEOUT,
		maxPayload: constants.MAX_PAYLOAD,
		perMessageDeflate: false,
	});

	const connection = new Connection(ws, {
		direction: Direction.Outbound,
		remoteAddress: new URL(url).hostname,
	});

	await connection.open();

	return connection;
};

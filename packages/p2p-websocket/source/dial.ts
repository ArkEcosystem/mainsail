import WebSocket from "ws";

import { Connection } from "./connection.js";
import { Direction } from "./enums.js";

export type DialOptions = {
	version: number;
	connectTimeout: number;
	handshakeTimeout: number;
	maxPayload: number;
};

// Opens an outbound socket, runs the handshake and returns an open connection.
// The connection takes the socket while it is still connecting so no frame is missed.
export const dial = async (url: string, options: DialOptions): Promise<Connection> => {
	const ws = new WebSocket(url, {
		handshakeTimeout: options.connectTimeout,
		maxPayload: options.maxPayload,
		perMessageDeflate: false,
	});

	const connection = new Connection(ws, {
		direction: Direction.Outbound,
		handshakeTimeout: options.handshakeTimeout,
		remoteAddress: new URL(url).hostname,
		version: options.version,
	});

	await connection.open();

	return connection;
};

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import WebSocket from "ws";

import type { Connection, ConnectionFactory } from "./connection.js";

import { constants } from "./constants.js";
import { Direction } from "./enums.js";

// Opens outbound sockets, runs the handshake and returns open connections.
@injectable()
export class Dialer {
	@inject(Identifiers.P2P.WebSocket.Connection.Factory)
	private readonly createConnection!: ConnectionFactory;

	// The connection takes the socket while it is still connecting so no frame is missed.
	public async dial(url: string): Promise<Connection> {
		const ws = new WebSocket(url, {
			handshakeTimeout: constants.CONNECT_TIMEOUT,
			maxPayload: constants.MAX_PAYLOAD,
			perMessageDeflate: false,
		});

		const connection = this.createConnection(ws, {
			direction: Direction.Outbound,
			remoteAddress: new URL(url).hostname,
		});

		await connection.open();

		return connection;
	}
}

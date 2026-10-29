import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject } from "@mainsail/container";
import WebSocket from "ws";

import type { ConnectionRepository } from "./connection-repository.js";
import type { Connection, ConnectionFactory } from "./connection.js";
import type { ConnectionVerifier } from "./interfaces/index.js";
import type { Router } from "./router.js";

import { constants } from "./constants.js";
import { Direction } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Opens outbound sockets, runs the handshake and returns open connections.
@injectable()
export class Dialer {
	@inject(Identifiers.P2P.WebSocket.Connection.Factory)
	private readonly createConnection!: ConnectionFactory;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	@multiInject(Identifiers.P2P.WebSocket.Connection.Verifiers)
	private readonly verifiers!: ConnectionVerifier[];

	@inject(Identifiers.P2P.WebSocket.Router)
	private readonly router!: Router;

	// The connection takes the socket while it is still connecting so no frame is missed.
	public async dial(url: string): Promise<Connection> {
		const remoteAddress = new URL(url).hostname;

		for (const verifier of this.verifiers) {
			const rejection = verifier.verify(remoteAddress);
			if (rejection) {
				throw new ConnectionError(rejection, `Refused to dial ${remoteAddress}: ${rejection}`);
			}
		}

		const ws = new WebSocket(url, {
			handshakeTimeout: constants.CONNECT_TIMEOUT,
			maxPayload: constants.MAX_PAYLOAD,
			perMessageDeflate: false,
		});

		const connection = this.createConnection(ws, { direction: Direction.Outbound, remoteAddress });
		connection.onRequest = (path, payload) => this.router.handle(connection, path, payload);
		this.repository.add(connection);
		connection.onClose(() => this.repository.remove(connection));

		await connection.open();

		return connection;
	}
}

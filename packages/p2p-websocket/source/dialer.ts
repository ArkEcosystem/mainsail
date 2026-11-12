import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject } from "@mainsail/container";
import { IpAddress, randomNumber, sleep } from "@mainsail/utils";
import WebSocket from "ws";

import type { ConnectionRepository } from "./connection-repository.js";
import type { Connection, ConnectionFactory, ConnectionVerifier } from "./interfaces/index.js";
import type { Router } from "./router.js";

import { constants } from "./constants.js";
import { CloseReason, Direction } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Opens outbound sockets and runs the handshake. Open connections are reported through
// `onConnection`, the same way the listener reports inbound ones, so the caller has one path.
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

	// Called once the handshake has completed.
	public onConnection?: (connection: Connection) => void;

	// Rejects when the socket or the handshake fails; then `onConnection` is not called. A dial refused
	// as a duplicate crossed the peer's own dial to us: after a random pause either the peer's connection
	// has landed, and that is the connection, or we dial once more and go first this time.
	public async dial(url: string): Promise<void> {
		const hostname = new URL(url).hostname;
		const remoteAddress = IpAddress.sanitizeRemoteAddress(hostname) ?? hostname;

		try {
			await this.#dial(url, remoteAddress);
			return;
		} catch (error) {
			if (!(error instanceof ConnectionError) || error.reason !== CloseReason.DuplicatePeer) {
				throw error;
			}
		}

		await sleep(randomNumber(constants.DIAL_RETRY_MIN_DELAY, constants.DIAL_RETRY_MAX_DELAY));

		if (this.repository.get(remoteAddress)) {
			return;
		}

		await this.#dial(url, remoteAddress);
	}

	// The connection takes the socket while it is still connecting so no frame is missed.
	async #dial(url: string, remoteAddress: string): Promise<void> {
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

		this.onConnection?.(connection);
	}
}

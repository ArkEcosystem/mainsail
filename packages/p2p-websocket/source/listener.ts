import type { Contracts } from "@mainsail/contracts";
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";
import { WebSocketServer } from "ws";

import type { ConnectionRepository } from "./connection-repository.js";
import type { Connection, ConnectionFactory, ConnectionVerifier } from "./interfaces/index.js";
import type { Router } from "./router.js";

import { constants } from "./constants.js";
import { CloseReason, Direction, ListenerState } from "./enums.js";

// Accepts WebSocket upgrades on a server it does not own and turns them into connections.
// Attach it before the server starts listening, otherwise upgrades in between are refused.
@injectable()
export class Listener {
	@inject(Identifiers.P2P.WebSocket.Logger)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.P2P.WebSocket.Connection.Factory)
	private readonly createConnection!: ConnectionFactory;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	@multiInject(Identifiers.P2P.WebSocket.Connection.Verifiers)
	private readonly verifiers!: ConnectionVerifier[];

	@inject(Identifiers.P2P.WebSocket.Router)
	private readonly router!: Router;

	// Called after the verifiers, before the handshake. Returning a reason rejects the socket.
	public accept?: (remoteAddress: string) => CloseReason | undefined;

	// Called once the handshake has completed.
	public onConnection?: (connection: Connection) => void;

	// Errors ws re-emits from the underlying server while the listener is attached.
	public onError?: (error: Error) => void;

	// Owned by the caller: it is listened on and closed outside the listener.
	#server!: HttpServer | HttpsServer;
	#state = ListenerState.Stopped;
	#wss?: WebSocketServer;

	public initialize(server: HttpServer | HttpsServer): void {
		this.#server = server;
	}

	public get state(): ListenerState {
		return this.#state;
	}

	public start(): void {
		if (this.#state !== ListenerState.Stopped) {
			throw new Error(`Listener cannot start while ${this.#state}`);
		}

		this.#wss = new WebSocketServer({
			maxPayload: constants.MAX_PAYLOAD,
			perMessageDeflate: false,
			server: this.#server,
		});

		// ws re-emits the server's errors here; without a listener they would crash the process.
		this.#wss.on("error", (error) => {
			if (this.#state === ListenerState.Listening) {
				this.logger.error(`Listener error: ${error.message}`, "p2p");
				this.onError?.(error);
			}
		});

		this.#wss.on("connection", (ws, request) => {
			ws.on("error", () => {});

			const remoteAddress = IpAddress.sanitizeRemoteAddress(request.socket.remoteAddress ?? "") ?? "";
			const connection = this.createConnection(ws, { direction: Direction.Inbound, remoteAddress });
			connection.onRequest = (path, payload) => this.router.handle(connection, path, payload);

			// Sockets that complete the upgrade while stop() is in progress are dropped here.
			const rejection =
				this.#state === ListenerState.Listening ? this.#verify(remoteAddress) : CloseReason.Shutdown;
			if (rejection) {
				this.logger.debug(`Rejected inbound socket from ${remoteAddress}: ${rejection}`, "p2p");
				connection.reject(rejection);
				return;
			}

			this.repository.add(connection);
			connection.onClose(() => this.repository.remove(connection));

			void this.#open(connection);
		});

		this.#state = ListenerState.Listening;
	}

	// Closes the inbound connections and detaches from the server. The server itself stays up.
	public async stop(): Promise<void> {
		if (this.#state !== ListenerState.Listening) {
			return;
		}

		this.#state = ListenerState.Stopping;

		await Promise.all(
			this.repository
				.all()
				.filter((connection) => connection.direction === Direction.Inbound)
				.map((connection) => connection.close(CloseReason.Shutdown)),
		);

		this.#wss?.close();
		for (const ws of this.#wss?.clients ?? []) {
			ws.terminate();
		}

		this.#wss = undefined;
		this.#state = ListenerState.Stopped;
	}

	#verify(remoteAddress: string): CloseReason | undefined {
		for (const verifier of this.verifiers) {
			const rejection = verifier.verify(remoteAddress);
			if (rejection) {
				return rejection;
			}
		}

		return this.accept?.(remoteAddress);
	}

	async #open(connection: Connection): Promise<void> {
		try {
			await connection.open();
		} catch {
			return; // Already terminated with its reason, which the connection logged on close.
		}

		this.logger.debug(`Accepted inbound connection from ${connection.remoteAddress}`, "p2p");
		this.onConnection?.(connection);
	}
}

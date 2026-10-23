import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";

import { WebSocketServer } from "ws";

import { Connection } from "./connection.js";
import { CloseReason, Direction, ListenerState } from "./enums.js";

export type ListenerOptions = {
	// Owned by the caller: it is listened on and closed outside the listener.
	server: HttpServer | HttpsServer;
	version: number;
	handshakeTimeout: number;
	maxPayload: number;
};

// Accepts WebSocket upgrades on a server it does not own and turns them into connections.
// Attach it before the server starts listening, otherwise upgrades in between are refused.
export class Listener {
	// Called before the handshake. Returning a reason rejects the socket.
	public accept?: (remoteAddress: string) => CloseReason | undefined;

	// Called once the handshake has completed.
	public onConnection?: (connection: Connection) => void;

	// Errors ws re-emits from the underlying server while the listener is attached.
	public onError?: (error: Error) => void;

	readonly #options: ListenerOptions;
	readonly #connections = new Set<Connection>();

	#state = ListenerState.Stopped;
	#wss?: WebSocketServer;

	public constructor(options: ListenerOptions) {
		this.#options = options;
	}

	public get state(): ListenerState {
		return this.#state;
	}

	public get connections(): ReadonlySet<Connection> {
		return this.#connections;
	}

	public start(): void {
		if (this.#state !== ListenerState.Stopped) {
			throw new Error(`Listener cannot start while ${this.#state}`);
		}

		this.#wss = new WebSocketServer({
			maxPayload: this.#options.maxPayload,
			perMessageDeflate: false,
			server: this.#options.server,
		});

		// ws re-emits the server's errors here; without a listener they would crash the process.
		this.#wss.on("error", (error) => {
			if (this.#state === ListenerState.Listening) {
				this.onError?.(error);
			}
		});

		this.#wss.on("connection", (ws, request) => {
			ws.on("error", () => {});

			const remoteAddress = request.socket.remoteAddress ?? "";
			const connection = new Connection(ws, {
				direction: Direction.Inbound,
				handshakeTimeout: this.#options.handshakeTimeout,
				remoteAddress,
				version: this.#options.version,
			});

			// Sockets that complete the upgrade while stop() is in progress are dropped here.
			const rejection =
				this.#state === ListenerState.Listening ? this.accept?.(remoteAddress) : CloseReason.Shutdown;
			if (rejection) {
				connection.terminate(rejection);
				return;
			}

			this.#connections.add(connection);
			connection.onClose = () => this.#connections.delete(connection);

			void connection
				.open()
				.then(() => this.onConnection?.(connection))
				.catch(() => {}); // The connection has already been terminated with its reason.
		});

		this.#state = ListenerState.Listening;
	}

	// Closes all connections and detaches from the server. The server itself stays up.
	public async stop(): Promise<void> {
		if (this.#state !== ListenerState.Listening) {
			return;
		}

		this.#state = ListenerState.Stopping;

		await Promise.all([...this.#connections].map((connection) => connection.close(CloseReason.Shutdown)));

		this.#wss?.close();
		for (const ws of this.#wss?.clients ?? []) {
			ws.terminate();
		}

		this.#wss = undefined;
		this.#state = ListenerState.Stopped;
	}
}

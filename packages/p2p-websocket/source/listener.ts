import { createServer, type Server as HttpServer } from "node:http";
import { type AddressInfo } from "node:net";
import { WebSocketServer } from "ws";

import { Connection } from "./connection.js";
import { CloseReason, Direction } from "./enums.js";

export type ListenerOptions = {
	host: string;
	port: number;
	version: number;
	handshakeTimeout: number;
	maxPayload: number;
};

export class Listener {
	// Called before the handshake. Returning a reason rejects the socket.
	public accept?: (remoteAddress: string) => CloseReason | undefined;

	// Called once the handshake has completed.
	public onConnection?: (connection: Connection) => void;

	readonly #options: ListenerOptions;
	readonly #connections = new Set<Connection>();

	#http?: HttpServer;
	#wss?: WebSocketServer;

	public constructor(options: ListenerOptions) {
		this.#options = options;
	}

	public get address(): AddressInfo | undefined {
		const address = this.#http?.address();
		return address && typeof address === "object" ? address : undefined;
	}

	public get connections(): ReadonlySet<Connection> {
		return this.#connections;
	}

	public async start(): Promise<void> {
		this.#http = createServer((_, response) => {
			// Plain HTTP is not served; only the WebSocket upgrade is.
			response.writeHead(426, { Connection: "close", Upgrade: "websocket" }).end();
		});

		this.#wss = new WebSocketServer({
			maxPayload: this.#options.maxPayload,
			perMessageDeflate: false,
			server: this.#http,
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

			const rejection = this.accept?.(remoteAddress);
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

		const http = this.#http;
		await new Promise<void>((resolve, reject) => {
			http.once("error", reject);
			http.listen(this.#options.port, this.#options.host, () => {
				http.off("error", reject);
				resolve();
			});
		});
	}

	public async stop(): Promise<void> {
		await Promise.all([...this.#connections].map((connection) => connection.close(CloseReason.Shutdown)));

		this.#wss?.close();
		for (const ws of this.#wss?.clients ?? []) {
			ws.terminate();
		}

		await new Promise<void>((resolve) => {
			if (!this.#http) {
				resolve();
				return;
			}

			this.#http.close(() => resolve());
		});

		this.#http = undefined;
		this.#wss = undefined;
	}
}

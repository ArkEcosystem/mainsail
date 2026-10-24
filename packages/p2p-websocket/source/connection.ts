import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { once } from "node:events";
import WebSocket from "ws";

import type { Direction } from "./enums.js";

import { CloseReason, ConnectionState } from "./enums.js";
import { ConnectionError } from "./errors.js";
import { Handshake } from "./handlers/index.js";
import { decode, encode, type Message } from "./message.js";

export type ConnectionOptions = {
	direction: Direction;
	remoteAddress: string;
};

export type ConnectionFactory = (ws: WebSocket, options: ConnectionOptions) => Connection;

// One per socket, created through Identifiers.P2P.WebSocket.Connection.Factory and set up with init().
@injectable()
export class Connection {
	@inject(Identifiers.P2P.WebSocket.Logger)
	private readonly logger!: Contracts.Kernel.Logger;

	readonly #closeListeners: ((reason: CloseReason, error?: Error) => void)[] = [];

	#ws!: WebSocket;
	#handshake!: Handshake;
	#direction!: Direction;
	#remoteAddress!: string;

	#state = ConnectionState.Handshaking;
	#closeReason?: CloseReason;
	#closeError?: Error;
	#closed?: Promise<void>;

	public init(ws: WebSocket, options: ConnectionOptions): this {
		this.#ws = ws;
		this.#direction = options.direction;
		this.#remoteAddress = options.remoteAddress;

		this.#handshake = new Handshake({
			direction: options.direction,
			reject: (reason) => this.reject(reason),
			send: (message) => this.#send(message),
		});

		this.#ws.on("message", (data) => this.#onMessage(data));
		this.#ws.on("error", (error) => this.#onError(error));
		this.#ws.on("close", () => this.#onClose());

		return this;
	}

	// Several owners (repository, peer) need to know; listeners run in registration order, once.
	public onClose(listener: (reason: CloseReason, error?: Error) => void): void {
		this.#closeListeners.push(listener);
	}

	public get direction(): Direction {
		return this.#direction;
	}

	public get remoteAddress(): string {
		return this.#remoteAddress;
	}

	public get state(): ConnectionState {
		return this.#state;
	}

	// Waits for the socket to open if it is still connecting, then runs the handshake.
	// Rejects and closes the connection on failure.
	public async open(): Promise<void> {
		try {
			await this.#waitForOpen();
			await this.#handshake.start();
		} catch (error) {
			this.terminate(error instanceof ConnectionError ? error.reason : CloseReason.ProtocolError, error as Error);
			throw error;
		}

		if (this.#state === ConnectionState.Handshaking) {
			this.#state = ConnectionState.Open;
		}
	}

	// Graceful close; resolves once the socket has emitted "close". Idempotent.
	public async close(reason: CloseReason = CloseReason.LocalClose): Promise<void> {
		if (!this.#closed) {
			this.#begin(reason);
			this.#closed = this.#waitForClose();

			if (this.#ws.readyState === WebSocket.OPEN || this.#ws.readyState === WebSocket.CONNECTING) {
				this.#ws.close();
			} else {
				this.#ws.terminate();
			}
		}

		await this.#closed;
	}

	// Tells the peer why it is being refused, then terminates once the frame has been flushed.
	// Meant for the acceptor during the handshake; after that a plain close() is enough.
	public reject(reason: CloseReason): void {
		if (this.#closed) {
			return;
		}

		this.#begin(reason);
		this.#closed = this.#waitForClose();

		if (this.#ws.readyState === WebSocket.OPEN) {
			this.#ws.send(encode({ reason, type: "reject" }), () => this.#ws.terminate());
		} else {
			this.#ws.terminate();
		}
	}

	// Immediate close without the closing handshake.
	public terminate(reason: CloseReason, error?: Error): void {
		if (this.#closed) {
			return;
		}

		this.#begin(reason, error);
		this.#closed = this.#waitForClose();
		this.#ws.terminate();
	}

	#onMessage(data: WebSocket.RawData): void {
		let message: Message;
		try {
			message = decode(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
		} catch (error) {
			this.terminate(CloseReason.ProtocolError, error as Error);
			return;
		}

		switch (message.type) {
			case "hello": {
				this.#handshake.onHello(message);
				break;
			}
			case "reject": {
				this.#handshake.onReject(message);
				break;
			}
		}
	}

	#onError(error: Error): void {
		this.#handshake.abort(new ConnectionError(CloseReason.SocketError, error.message, { cause: error }));
		this.terminate(CloseReason.SocketError, error);
	}

	#onClose(): void {
		this.#handshake.abort(new ConnectionError(CloseReason.RemoteClose, "Socket closed during handshake"));

		if (this.#closeReason === undefined) {
			this.#closeReason = CloseReason.RemoteClose;
		}

		this.#state = ConnectionState.Closed;
		this.logger.debug(
			`${this.#direction} connection to ${this.#remoteAddress} closed: ${this.#closeReason}` +
				(this.#closeError ? ` (${this.#closeError.message})` : ""),
			"p2p",
		);
		for (const listener of this.#closeListeners) {
			listener(this.#closeReason, this.#closeError);
		}
	}

	#begin(reason: CloseReason, error?: Error): void {
		this.#state = ConnectionState.Closing;
		this.#closeReason = reason;
		this.#closeError = error;

		// A close that starts during the handshake must fail open(), so the owner never sees the connection.
		this.#handshake.abort(new ConnectionError(reason, "Connection closed during handshake", { cause: error }));
	}

	// `once` rejects with the socket error if the connection attempt fails.
	async #waitForOpen(): Promise<void> {
		if (this.#ws.readyState === WebSocket.OPEN) {
			return;
		}

		if (this.#ws.readyState !== WebSocket.CONNECTING) {
			throw new ConnectionError(CloseReason.SocketError, "Socket is not open");
		}

		try {
			await once(this.#ws, "open");
		} catch (rawError) {
			const error = ensureError(rawError);
			throw new ConnectionError(CloseReason.SocketError, error.message, { cause: error });
		}
	}

	// Not `once`: ws emits "error" before "close" when a connecting socket is aborted, and that must not
	// reject the close promise. The error listener from init() handles the error itself.
	async #waitForClose(): Promise<void> {
		if (this.#ws.readyState === WebSocket.CLOSED) {
			return;
		}

		await new Promise<void>((resolve) => this.#ws.once("close", () => resolve()));
	}

	#send(message: Message): void {
		if (this.#ws.readyState !== WebSocket.OPEN) {
			return;
		}

		this.#ws.send(encode(message));
	}
}

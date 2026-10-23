import WebSocket from "ws";

import type { Direction } from "./enums.js";

import { CloseReason, ConnectionState } from "./enums.js";
import { ConnectionError } from "./errors.js";
import { Handshake } from "./handshake.js";
import { decode, encode, type Message } from "./message.js";

export type ConnectionOptions = {
	direction: Direction;
	remoteAddress: string;
	version: number;
	handshakeTimeout: number;
};

export class Connection {
	public readonly direction: Direction;
	public readonly remoteAddress: string;

	public onClose?: (reason: CloseReason, error?: Error) => void;

	readonly #ws: WebSocket;
	readonly #handshake: Handshake;

	#state = ConnectionState.Handshaking;
	#closeReason?: CloseReason;
	#closeError?: Error;
	#closed?: Promise<void>;

	public constructor(ws: WebSocket, options: ConnectionOptions) {
		this.#ws = ws;
		this.direction = options.direction;
		this.remoteAddress = options.remoteAddress;

		this.#handshake = new Handshake({
			send: (message) => this.#send(message),
			timeout: options.handshakeTimeout,
			version: options.version,
		});

		this.#ws.on("message", (data) => this.#onMessage(data));
		this.#ws.on("error", (error) => this.#onError(error));
		this.#ws.on("close", () => this.#onClose());
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
	public close(reason: CloseReason = CloseReason.LocalClose): Promise<void> {
		if (this.#closed) {
			return this.#closed;
		}

		this.#begin(reason);
		this.#closed = this.#waitForClose();

		if (this.#ws.readyState === WebSocket.OPEN || this.#ws.readyState === WebSocket.CONNECTING) {
			this.#ws.close();
		} else {
			this.#ws.terminate();
		}

		return this.#closed;
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
		this.onClose?.(this.#closeReason, this.#closeError);
	}

	#begin(reason: CloseReason, error?: Error): void {
		this.#state = ConnectionState.Closing;
		this.#closeReason = reason;
		this.#closeError = error;

		// A close that starts during the handshake must fail open(), so the owner never sees the connection.
		this.#handshake.abort(new ConnectionError(reason, "Connection closed during handshake", { cause: error }));
	}

	#waitForOpen(): Promise<void> {
		if (this.#ws.readyState === WebSocket.OPEN) {
			return Promise.resolve();
		}

		if (this.#ws.readyState !== WebSocket.CONNECTING) {
			return Promise.reject(new ConnectionError(CloseReason.SocketError, "Socket is not open"));
		}

		return new Promise<void>((resolve, reject) => {
			const onOpen = () => {
				this.#ws.off("error", onError);
				resolve();
			};
			const onError = (error: Error) => {
				this.#ws.off("open", onOpen);
				reject(new ConnectionError(CloseReason.SocketError, error.message, { cause: error }));
			};
			this.#ws.once("open", onOpen);
			this.#ws.once("error", onError);
		});
	}

	#waitForClose(): Promise<void> {
		if (this.#ws.readyState === WebSocket.CLOSED) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => this.#ws.once("close", () => resolve()));
	}

	#send(message: Message): void {
		if (this.#ws.readyState !== WebSocket.OPEN) {
			return;
		}

		this.#ws.send(encode(message));
	}
}

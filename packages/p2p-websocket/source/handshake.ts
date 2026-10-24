import type { HelloMessage, Message } from "./message.js";

import { constants } from "./constants.js";
import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";

export type HandshakeOptions = {
	send: (message: Message) => void;
};

// Both sides send hello as soon as the socket is open and wait for the peer's hello.
// The peer's hello may arrive before start() is called (it can share the TCP chunk with
// the upgrade response), so the result promise exists from construction.
export class Handshake {
	readonly #options: HandshakeOptions;
	readonly #done: Promise<void>;

	#resolve!: () => void;
	#reject!: (error: ConnectionError) => void;
	#settled = false;
	#timer?: NodeJS.Timeout;

	public constructor(options: HandshakeOptions) {
		this.#options = options;
		this.#done = new Promise<void>((resolve, reject) => {
			this.#resolve = resolve;
			this.#reject = reject;
		});
		// A rejection before start() is awaited must not be reported as unhandled.
		this.#done.catch(() => {});
	}

	// Our hello is always sent; the peer may already have settled the handshake by sending theirs first.
	public async start(): Promise<void> {
		this.#options.send({ type: "hello", version: constants.PROTOCOL_VERSION });

		if (!this.#settled) {
			this.#timer = setTimeout(() => {
				this.#fail(new ConnectionError(CloseReason.HandshakeTimeout, "Handshake timed out"));
			}, constants.HANDSHAKE_TIMEOUT);
		}

		await this.#done;
	}

	public onHello(message: HelloMessage): void {
		if (this.#settled) {
			this.#fail(new ConnectionError(CloseReason.ProtocolError, "Unexpected hello"));
			return;
		}

		if (message.version !== constants.PROTOCOL_VERSION) {
			this.#fail(
				new ConnectionError(
					CloseReason.VersionMismatch,
					`Protocol version mismatch: expected ${constants.PROTOCOL_VERSION}, got ${message.version}`,
				),
			);
			return;
		}

		this.#settle();
		this.#resolve();
	}

	public abort(error: ConnectionError): void {
		this.#fail(error);
	}

	#fail(error: ConnectionError): void {
		if (this.#settled) {
			return;
		}

		this.#settle();
		this.#reject(error);
	}

	#settle(): void {
		this.#settled = true;
		clearTimeout(this.#timer);
	}
}

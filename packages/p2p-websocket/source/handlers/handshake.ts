import type { HelloMessage, Message, RejectMessage } from "../message.js";

import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { ConnectionError } from "../errors.js";

export type HandshakeOptions = {
	direction: Direction;
	send: (message: Message) => void;
	reject: (reason: CloseReason) => void;
};

// The dialer sends hello and waits for the acceptor's hello back. The acceptor waits for the
// dialer's hello, checks it, and either echoes hello or sends reject and closes. Both sides give
// the other HANDSHAKE_TIMEOUT from start(). The dialer's hello may reach the acceptor before its
// start() runs (same TCP chunk as the upgrade), so the result promise exists from construction.
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

	public async start(): Promise<void> {
		if (this.#options.direction === Direction.Outbound) {
			this.#options.send({ type: "hello", version: constants.PROTOCOL_VERSION });
		}

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
			if (this.#options.direction === Direction.Inbound) {
				this.#options.reject(CloseReason.VersionMismatch);
			}

			this.#fail(
				new ConnectionError(
					CloseReason.VersionMismatch,
					`Protocol version mismatch: expected ${constants.PROTOCOL_VERSION}, got ${message.version}`,
				),
			);
			return;
		}

		if (this.#options.direction === Direction.Inbound) {
			this.#options.send({ type: "hello", version: constants.PROTOCOL_VERSION });
		}

		this.#settle();
		this.#resolve();
	}

	public onReject(message: RejectMessage): void {
		if (this.#settled || this.#options.direction !== Direction.Outbound) {
			this.#fail(new ConnectionError(CloseReason.ProtocolError, "Unexpected reject"));
			return;
		}

		this.#fail(new ConnectionError(message.reason, `Rejected by peer: ${message.reason}`));
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

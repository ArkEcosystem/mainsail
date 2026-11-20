import type { HandshakeOptions, HelloMessage, RejectMessage } from "../interfaces/index.js";

import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { ConnectionError } from "../errors.js";

// The dialer sends hello and waits for the acceptor's hello back. The acceptor waits for the
// dialer's hello, checks it, and either answers with its own hello or sends reject and closes. A hello
// names the version of the wire protocol, which must be ours, and the version of the sender's software,
// which must be one we connect with; each side checks the other's. Both sides give
// the other HANDSHAKE_TIMEOUT from start(). The dialer's hello may reach the acceptor before its
// start() runs (same TCP chunk as the upgrade), so the result promise exists from construction.
// The connection is opened through the `open` callback, not by awaiting start(): the acceptor's
// first request may arrive in the same TCP chunk as its hello, and ws emits both messages in one
// tick, before a promise continuation would have run.
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
			this.#options.send(this.#hello());
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
			this.#options.fail(new ConnectionError(CloseReason.ProtocolError, "Unexpected hello"));
			return;
		}

		if (message.protocolVersion !== constants.PROTOCOL_VERSION) {
			this.#refuse(
				`Protocol version mismatch: expected ${constants.PROTOCOL_VERSION}, got ${message.protocolVersion}`,
			);
			return;
		}

		// The version comes from the peer; quoted, whatever it holds stays within its log line.
		if (!this.#options.isValidVersion(message.version)) {
			this.#refuse(`Software version ${JSON.stringify(message.version)} is not accepted`);
			return;
		}

		if (this.#options.direction === Direction.Inbound) {
			this.#options.send(this.#hello());
		}

		this.#settle();
		this.#options.open(message);
		this.#resolve();
	}

	public onReject(message: RejectMessage): void {
		if (this.#settled) {
			this.#options.fail(new ConnectionError(CloseReason.ProtocolError, "Unexpected reject"));
			return;
		}

		if (this.#options.direction !== Direction.Outbound) {
			this.#fail(new ConnectionError(CloseReason.ProtocolError, "Unexpected reject"));
			return;
		}

		this.#fail(new ConnectionError(message.reason, `Rejected by peer: ${message.reason}`));
	}

	public abort(error: ConnectionError): void {
		this.#fail(error);
	}

	// The acceptor tells the dialer why; the dialer just hangs up.
	#refuse(message: string): void {
		if (this.#options.direction === Direction.Inbound) {
			this.#options.reject(CloseReason.VersionMismatch);
		}

		this.#fail(new ConnectionError(CloseReason.VersionMismatch, message));
	}

	#hello(): HelloMessage {
		return { protocolVersion: constants.PROTOCOL_VERSION, type: "hello", version: this.#options.version };
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

import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { ConnectionError } from "../errors.js";

export type HeartbeatOptions = {
	direction: Direction;
	ping: () => void;
	fail: (error: ConnectionError) => void;
};

// Detects a dead connection that the socket does not report, and a peer that misuses the heartbeat.
// Only the dialer pings: every HEARTBEAT_INTERVAL it sends a ping and expects the pong before the
// next one. The acceptor answers through the socket library and expects the pings to keep coming,
// neither too late (HEARTBEAT_TIMEOUT) nor too close together (HEARTBEAT_MIN_SPACING). A ping on the
// dialer's side or a pong on the acceptor's side, or a pong nobody asked for, is a protocol error.
export class Heartbeat {
	readonly #options: HeartbeatOptions;

	#timer?: NodeJS.Timeout;
	#awaitingPong = false;
	#lastPingAt?: number;
	#stopped = false;

	public constructor(options: HeartbeatOptions) {
		this.#options = options;
	}

	public start(): void {
		if (this.#options.direction === Direction.Outbound) {
			this.#timer = setInterval(() => this.#ping(), constants.HEARTBEAT_INTERVAL);
		} else {
			this.#expectPing();
		}
	}

	// Once stopped, by the connection closing or by a failure, nothing that still arrives matters.
	public stop(): void {
		this.#stopped = true;
		clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	public onPing(): void {
		if (this.#stopped) {
			return;
		}

		if (this.#options.direction === Direction.Outbound) {
			this.#fail(CloseReason.ProtocolError, "Unexpected ping");
			return;
		}

		const now = Date.now();
		if (this.#lastPingAt !== undefined && now - this.#lastPingAt < constants.HEARTBEAT_MIN_SPACING) {
			this.#fail(CloseReason.ProtocolError, "Pings too close together");
			return;
		}

		this.#lastPingAt = now;
		this.#expectPing();
	}

	public onPong(): void {
		if (this.#stopped) {
			return;
		}

		if (this.#options.direction === Direction.Inbound || !this.#awaitingPong) {
			this.#fail(CloseReason.ProtocolError, "Unexpected pong");
			return;
		}

		this.#awaitingPong = false;
	}

	// Dialer: ping, unless the previous ping is still unanswered.
	#ping(): void {
		if (this.#awaitingPong) {
			this.#fail(CloseReason.HeartbeatTimeout, "Peer did not answer the heartbeat");
			return;
		}

		this.#awaitingPong = true;
		this.#options.ping();
	}

	// Acceptor: the next ping has to arrive before the timeout.
	#expectPing(): void {
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => {
			this.#fail(CloseReason.HeartbeatTimeout, "Peer stopped sending heartbeats");
		}, constants.HEARTBEAT_TIMEOUT);
	}

	#fail(reason: CloseReason, message: string): void {
		this.stop();
		this.#options.fail(new ConnectionError(reason, message));
	}
}

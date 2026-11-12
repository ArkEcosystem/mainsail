import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { ConnectionError } from "../errors.js";

export type HeartbeatOptions = {
	direction: Direction;
	ping: () => void;
	fail: (error: ConnectionError) => void;
};

// Detects a dead connection that the socket does not report, and a peer that misuses the heartbeat.
// Only the dialer pings: every HEARTBEAT_INTERVAL it sends a ping, and it fails once the oldest ping
// has waited HEARTBEAT_TIMEOUT for its pong. Pings keep their cadence while one is outstanding, so a
// stall of the event loop (the pong already received but not yet read when the timer fires) neither
// kills the connection nor starves the acceptor. The acceptor answers through the socket library and
// expects the pings to keep coming, neither too late (HEARTBEAT_TIMEOUT) nor too close together
// (HEARTBEAT_MIN_SPACING). A ping on the dialer's side or a pong on the acceptor's side, or a pong
// nobody asked for, is a protocol error.
export class Heartbeat {
	readonly #options: HeartbeatOptions;

	#timer?: NodeJS.Timeout;
	// Dialer: when each unanswered ping was sent, oldest first. Acceptor: when the last ping arrived.
	readonly #unansweredPings: number[] = [];
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

		if (this.#options.direction === Direction.Inbound || this.#unansweredPings.length === 0) {
			this.#fail(CloseReason.ProtocolError, "Unexpected pong");
			return;
		}

		this.#unansweredPings.shift();
	}

	// Dialer: fail once the oldest ping has waited too long, otherwise keep pinging on the beat.
	#ping(): void {
		const now = Date.now();

		if (this.#unansweredPings.length > 0 && now - this.#unansweredPings[0] >= constants.HEARTBEAT_TIMEOUT) {
			this.#fail(CloseReason.HeartbeatTimeout, "Peer did not answer the heartbeat");
			return;
		}

		this.#unansweredPings.push(now);
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

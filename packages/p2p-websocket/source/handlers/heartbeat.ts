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
// expects the pings to keep coming, neither too late (HEARTBEAT_TIMEOUT) nor too many within that
// time (HEARTBEAT_MAX_PINGS; two arriving together after a retransmit is fine, a flood is not). A ping
// on the dialer's side or a pong on the acceptor's side, or a pong nobody asked for, is a protocol error.
export class Heartbeat {
	readonly #options: HeartbeatOptions;

	#timer?: NodeJS.Timeout;
	// Dialer: when each unanswered ping was sent. Acceptor: when the pings of the last timeout window
	// arrived. Both oldest first.
	readonly #pings: number[] = [];
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
		while (this.#pings.length > 0 && now - this.#pings[0] >= constants.HEARTBEAT_TIMEOUT) {
			this.#pings.shift();
		}

		this.#pings.push(now);
		if (this.#pings.length > constants.HEARTBEAT_MAX_PINGS) {
			this.#fail(CloseReason.ProtocolError, "Too many pings");
			return;
		}

		this.#expectPing();
	}

	public onPong(): void {
		if (this.#stopped) {
			return;
		}

		if (this.#options.direction === Direction.Inbound || this.#pings.length === 0) {
			this.#fail(CloseReason.ProtocolError, "Unexpected pong");
			return;
		}

		this.#pings.shift();
	}

	// Dialer: fail once the oldest ping has waited too long, otherwise keep pinging on the beat.
	#ping(): void {
		const now = Date.now();

		if (this.#pings.length > 0 && now - this.#pings[0] >= constants.HEARTBEAT_TIMEOUT) {
			this.#fail(CloseReason.HeartbeatTimeout, "Peer did not answer the heartbeat");
			return;
		}

		this.#pings.push(now);
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

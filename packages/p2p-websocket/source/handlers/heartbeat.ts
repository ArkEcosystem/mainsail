import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { ConnectionError } from "../errors.js";

export type HeartbeatOptions = {
	ping: () => void;
	fail: (error: ConnectionError) => void;
};

// Detects a dead connection that the socket does not report: every HEARTBEAT_INTERVAL a ping goes out,
// and if the previous one is still unanswered the connection has failed. Both ends run their own;
// the pong is sent by the socket library itself. Only an open connection is watched.
export class Heartbeat {
	readonly #options: HeartbeatOptions;

	#timer?: NodeJS.Timeout;
	#awaitingPong = false;

	public constructor(options: HeartbeatOptions) {
		this.#options = options;
	}

	public start(): void {
		this.#timer = setInterval(() => this.#tick(), constants.HEARTBEAT_INTERVAL);
	}

	public stop(): void {
		clearInterval(this.#timer);
		this.#timer = undefined;
	}

	public onPong(): void {
		this.#awaitingPong = false;
	}

	#tick(): void {
		if (this.#awaitingPong) {
			this.stop();
			this.#options.fail(new ConnectionError(CloseReason.HeartbeatTimeout, "Peer did not answer the heartbeat"));
			return;
		}

		this.#awaitingPong = true;
		this.#options.ping();
	}
}

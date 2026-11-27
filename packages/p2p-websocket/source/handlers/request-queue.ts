import type { RequestLimits } from "../interfaces/index.js";

import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { ConnectionError } from "../errors.js";

type Waiting = {
	path: string;
	resolve: () => void;
	reject: (error: ConnectionError) => void;
};

// The route's limits for a path; `undefined` for a path we have no route for, which is then held to
// the connection's limits only.
export type RequestLimitsLookup = (path: string) => RequestLimits | undefined;

// Holds our outgoing requests to the limits the peer enforces, so we never make it refuse us: at most
// MAX_REQUESTS_IN_FLIGHT on the connection and `maxConcurrentRequests` per route may be on the wire.
// A request beyond that waits in arrival order until both its slots are free, unless the queue of the
// connection or of its route is full, in which case it fails at once; that failure is ours, not the
// peer's. The caller sends the frame itself once `acquire` resolves and calls `release` when done.
export class RequestQueue {
	readonly #limitsFor: RequestLimitsLookup;
	readonly #inFlight = new Map<string, number>();
	readonly #queued = new Map<string, number>();
	readonly #waiting: Waiting[] = [];

	#inFlightTotal = 0;

	public constructor(limitsFor: RequestLimitsLookup) {
		this.#limitsFor = limitsFor;
	}

	public async acquire(path: string): Promise<void> {
		const limits = this.#limitsFor(path);

		if (this.#isFree(path, limits)) {
			this.#take(path);
			return;
		}

		if (this.#waiting.length >= constants.MAX_QUEUED_REQUESTS) {
			throw new ConnectionError(CloseReason.RequestQueueFull, `${this.#waiting.length} requests already queued`);
		}

		const queued = this.#queued.get(path) ?? 0;
		if (limits && queued >= limits.maxQueuedRequests) {
			throw new ConnectionError(CloseReason.RequestQueueFull, `${queued} ${path} requests already queued`);
		}

		this.#queued.set(path, queued + 1);

		await new Promise<void>((resolve, reject) => {
			this.#waiting.push({ path, reject, resolve });
		});
	}

	public release(path: string): void {
		this.#inFlightTotal--;
		this.#inFlight.set(path, (this.#inFlight.get(path) ?? 1) - 1);

		// The first waiting request whose slots are now free goes next; the others keep their place.
		const index = this.#waiting.findIndex((waiting) => this.#isFree(waiting.path, this.#limitsFor(waiting.path)));
		if (index === -1) {
			return;
		}

		const [next] = this.#waiting.splice(index, 1);
		this.#dequeue(next.path);
		this.#take(next.path);
		next.resolve();
	}

	// Fails everything still waiting, e.g. when the connection closes.
	public abort(error: ConnectionError): void {
		for (const waiting of this.#waiting.splice(0)) {
			this.#dequeue(waiting.path);
			waiting.reject(error);
		}
	}

	#isFree(path: string, limits?: RequestLimits): boolean {
		if (this.#inFlightTotal >= constants.MAX_REQUESTS_IN_FLIGHT) {
			return false;
		}

		return !limits || (this.#inFlight.get(path) ?? 0) < limits.maxConcurrentRequests;
	}

	#take(path: string): void {
		this.#inFlightTotal++;
		this.#inFlight.set(path, (this.#inFlight.get(path) ?? 0) + 1);
	}

	#dequeue(path: string): void {
		this.#queued.set(path, (this.#queued.get(path) ?? 1) - 1);
	}
}

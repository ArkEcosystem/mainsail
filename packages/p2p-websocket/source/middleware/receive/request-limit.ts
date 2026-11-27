import { injectable } from "@mainsail/container";

import type { Connection, ReceiveContext, ReceiveMiddleware } from "../../interfaces/index.js";

import { CloseReason } from "../../enums.js";
import { RequestError } from "../../errors.js";

// Caps the requests one peer may have in progress on one route at the route's `maxConcurrentRequests`.
// The limits are part of the protocol both sides share and a sender counts its own requests, so one
// more is a violation: answered 429 and the connection goes. The per-connection cap lives on the
// connection itself.
@injectable()
export class RequestLimitMiddleware implements ReceiveMiddleware {
	readonly #inFlight = new Map<Connection, Map<string, number>>();

	public async before(context: ReceiveContext): Promise<void> {
		const { connection, route } = context;
		const counts = this.#counts(connection);
		const count = counts.get(route.path) ?? 0;

		if (count >= route.maxConcurrentRequests) {
			throw new RequestError(
				429,
				`${route.path} from ${connection.remoteAddress}: ${count} requests already in flight`,
				{ closeReason: CloseReason.ProtocolError },
			);
		}

		counts.set(route.path, count + 1);
	}

	// Only runs for requests `before` let through, so every decrement matches an increment.
	public async finally(context: ReceiveContext): Promise<void> {
		const counts = this.#inFlight.get(context.connection);
		if (counts) {
			counts.set(context.route.path, (counts.get(context.route.path) ?? 1) - 1);
		}
	}

	#counts(connection: Connection): Map<string, number> {
		let counts = this.#inFlight.get(connection);
		if (!counts) {
			counts = new Map();
			this.#inFlight.set(connection, counts);
			connection.onClose(() => this.#inFlight.delete(connection));
		}

		return counts;
	}
}

import { Identifiers } from "@mainsail/constants";
import { injectable, multiInject, optional } from "@mainsail/container";

import type { Connection } from "./connection.js";
import type { RouteDefinition, SendContext, SendMiddleware } from "./interfaces.js";

import { RequestError } from "./errors.js";

// Typed client side of a route: runs the send middleware, sends the frame and hands back the
// decoded response. A non-200 answer becomes a RequestError with that status code.
@injectable()
export class Sender {
	@multiInject(Identifiers.P2P.WebSocket.SendMiddleware)
	@optional()
	private readonly middleware: SendMiddleware[] = [];

	public async send<TRequest, TResponse>(
		connection: Connection,
		route: RouteDefinition<TRequest, TResponse>,
		data: TRequest,
	): Promise<TResponse> {
		// Without middleware the data must already be a buffer and the response stays one.
		const context: SendContext = {
			connection,
			request: { data, payload: Buffer.isBuffer(data) ? data : Buffer.alloc(0) },
			response: { data: undefined, payload: Buffer.alloc(0), statusCode: 0 },
			route,
		};

		for (const step of this.middleware) {
			await step.before?.(context);
		}

		const response = await connection.request(route.path, context.request.payload);
		context.response.statusCode = response.statusCode;
		context.response.payload = response.payload;
		context.response.data = response.payload;

		if (response.statusCode !== 200) {
			throw new RequestError(
				response.statusCode,
				`${route.path} to ${connection.remoteAddress} answered ${response.statusCode}`,
			);
		}

		for (const step of [...this.middleware].reverse()) {
			await step.after?.(context);
		}

		return context.response.data as TResponse;
	}
}

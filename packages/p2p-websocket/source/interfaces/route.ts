import type { RouteDefinition } from "./codec.js";
import type { Connection } from "./connection.js";

// One request path. The codec middleware decodes the request and encodes the response, so the
// handler works with objects only. A non-200 answer is a thrown RequestError.
export interface Route<TRequest, TResponse> extends RouteDefinition<TRequest, TResponse> {
	readonly maxBytes?: number;
	readonly schema?: string;

	handle(connection: Connection, data: TRequest): Promise<TResponse>;
}

// Client side of a route: runs the send middleware and hands back the decoded response.
export interface RouteSender {
	send<TRequest, TResponse>(
		connection: Connection,
		route: RouteDefinition<TRequest, TResponse>,
		data: TRequest,
	): Promise<TResponse>;
}

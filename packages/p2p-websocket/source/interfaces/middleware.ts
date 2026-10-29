import type { RouteDefinition } from "./codec.js";
import type { Connection } from "./connection.js";
import type { Route } from "./route.js";

export interface ReceiveContext {
	readonly connection: Connection;
	readonly route: Route<unknown, unknown>;
	readonly request: { readonly payload: Buffer; data?: unknown };
	readonly response: { payload?: Buffer; data?: unknown };
}

// A step around the route handler on the receiving side. `before` steps run in binding order,
// `after` steps in reverse. Throwing a RequestError ends the request with that status code.
export interface ReceiveMiddleware {
	before?(context: ReceiveContext): Promise<void>;
	after?(context: ReceiveContext): Promise<void>;
}

export interface SendContext {
	readonly connection: Connection;
	// `any`: a Codec is invariant in its type parameters, so no single concrete instantiation fits every route.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly route: RouteDefinition<any, any>;
	readonly request: { readonly data: unknown; payload?: Buffer };
	readonly response: { statusCode: number; payload: Buffer; data?: unknown };
}

// A step around an outgoing request. `before` steps run in binding order before the frame is sent,
// `after` steps in reverse once a 200 response is back. Throwing fails the send.
export interface SendMiddleware {
	before?(context: SendContext): Promise<void>;
	after?(context: SendContext): Promise<void>;
}

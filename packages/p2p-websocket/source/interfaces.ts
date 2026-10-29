import type { Connection } from "./connection.js";
import type { CloseReason } from "./enums.js";

// One check run before a socket is accepted. Returning a reason rejects the socket;
// `undefined` passes it on to the next verifier.
export interface ConnectionVerifier {
	verify(ip: string): CloseReason | undefined;
}

export interface Codec<TRequest, TResponse> {
	request: {
		serialize: (data: TRequest) => Buffer;
		deserialize: (payload: Buffer) => TRequest;
	};
	response: {
		serialize: (data: TResponse) => Buffer;
		deserialize: (payload: Buffer) => TResponse;
	};
}

// One request path. With a codec (and the codec middleware registered) the handler receives the
// decoded request and returns the response object; without one both are raw buffers.
// A non-200 answer is a thrown RequestError.
export interface Route<TRequest = Buffer, TResponse = Buffer> {
	readonly path: string;
	readonly codec?: Codec<TRequest, TResponse>;
	readonly maxBytes?: number;
	readonly schema?: string;

	handle(connection: Connection, data: TRequest): Promise<TResponse>;
}

// What `send` needs from a route: the same object a Route implementation can spread into itself,
// so one definition drives both the handler and the typed client call.
export type RouteDefinition<TRequest = Buffer, TResponse = Buffer> = Pick<Route<TRequest, TResponse>, "path" | "codec">;

export interface RequestContext {
	readonly connection: Connection;
	readonly route: Route<unknown, unknown>;
	readonly request: { readonly payload: Buffer; data: unknown };
	readonly response: { payload: Buffer; data: unknown };
}

// A step around the route handler. `before` steps run in binding order, `after` steps in reverse.
// Throwing a RequestError ends the request with that status code.
export interface Middleware {
	before?(context: RequestContext): Promise<void>;
	after?(context: RequestContext): Promise<void>;
}

export interface SendContext {
	readonly connection: Connection;
	// `any`: a Codec is invariant in its type parameters, so no single concrete instantiation fits every route.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly route: RouteDefinition<any, any>;
	readonly request: { data: unknown; payload: Buffer };
	readonly response: { statusCode: number; payload: Buffer; data: unknown };
}

// A step around an outgoing request. `before` steps run in binding order before the frame is sent,
// `after` steps in reverse once a 200 response is back. Throwing fails the send.
export interface SendMiddleware {
	before?(context: SendContext): Promise<void>;
	after?(context: SendContext): Promise<void>;
}

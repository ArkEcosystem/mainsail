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

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

// Largest encoded request the handler accepts (413 otherwise) and largest encoded response the
// caller accepts, in bytes. Both sides share the definition, so a server can budget its response
// against what the caller will take. The transport's MAX_PAYLOAD is the ceiling for both.
export interface PayloadLimits {
	readonly request: number;
	readonly response: number;
}

export type Schema = Record<string, unknown>;

// The shapes the decoded request and response of a route must have, as JSON schemas. Both sides share
// the definition, so one checks what we receive as the handler and the other what we get back as the
// caller. The transport does not read them itself: whoever defines the routes also binds the
// middleware that checks them.
export interface RouteSchema {
	readonly request: Schema;
	readonly response: Schema;
}

// What `send` needs from a route: the same object a Route implementation spreads into itself,
// so one definition drives both the handler and the typed client call.
export interface RouteDefinition<TRequest, TResponse> {
	readonly path: string;
	readonly codec: Codec<TRequest, TResponse>;
	readonly maxPayload: PayloadLimits;
	// Requests for this route one peer may have in progress at once; more are a violation. We hold
	// ourselves to the same number: further requests of ours wait, up to `maxQueuedRequests`.
	readonly maxConcurrentRequests: number;
	readonly maxQueuedRequests: number;
	readonly schema: RouteSchema;
}

export interface SendOptions {
	// How long to wait for the response, in milliseconds; the transport's REQUEST_TIMEOUT when omitted.
	readonly timeout?: number;
}

export interface RequestLimits {
	readonly maxConcurrentRequests: number;
	readonly maxQueuedRequests: number;
}

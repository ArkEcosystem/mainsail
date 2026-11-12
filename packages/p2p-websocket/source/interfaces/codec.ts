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

// What `send` needs from a route: the same object a Route implementation spreads into itself,
// so one definition drives both the handler and the typed client call.
export interface RouteDefinition<TRequest, TResponse> {
	readonly path: string;
	readonly codec: Codec<TRequest, TResponse>;
	readonly maxPayload: PayloadLimits;
}

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

// What `send` needs from a route: the same object a Route implementation spreads into itself,
// so one definition drives both the handler and the typed client call.
export interface RouteDefinition<TRequest, TResponse> {
	readonly path: string;
	readonly codec: Codec<TRequest, TResponse>;
}

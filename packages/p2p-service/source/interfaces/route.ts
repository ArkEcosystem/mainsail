import type { Interfaces } from "@mainsail/p2p-websocket";

export type Schema = Record<string, unknown>;

// The shapes a route's decoded request and response must have. Both sides share the definition, so
// one schema checks what we receive as the handler and the other what we get back as the caller.
export interface RouteSchema {
	readonly request: Schema;
	readonly response: Schema;
}

// A route of the transport with its schemas. Every route of this package has them.
export interface RouteDefinition<TRequest, TResponse> extends Interfaces.RouteDefinition<TRequest, TResponse> {
	readonly schema: RouteSchema;
}

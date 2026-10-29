import type { CloseReason, ConnectionState, Direction } from "../enums.js";
import type { RouteDefinition } from "./codec.js";

export type Response = { statusCode: number; payload: Buffer };

// Answers requests from the peer; set by the transport. Throwing yields a 500 with an empty payload.
export type RequestHandler = (path: string, payload: Buffer) => Promise<Response>;

// The public surface of a live connection, as routes, middleware and the p2p layer see it.
export interface Connection {
	readonly direction: Direction;
	readonly remoteAddress: string;
	readonly state: ConnectionState;

	// Typed request through the send middleware.
	send<TRequest, TResponse>(route: RouteDefinition<TRequest, TResponse>, data: TRequest): Promise<TResponse>;
	// Raw request: sends a frame and resolves with the peer's response, or rejects on timeout or close.
	request(path: string, payload: Buffer): Promise<Response>;

	// Graceful close; resolves once the socket has closed. Idempotent.
	close(reason?: CloseReason): Promise<void>;
	// Immediate close without the closing handshake.
	terminate(reason: CloseReason, error?: Error): void;
	// Several owners may listen; listeners run in registration order, once.
	onClose(listener: (reason: CloseReason, error?: Error) => void): void;
}

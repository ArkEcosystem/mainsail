import type WebSocket from "ws";

import type { CloseReason, ConnectionState, Direction } from "../enums.js";
import type { RouteDefinition } from "./codec.js";

export type Response = { statusCode: number; payload: Buffer };

export type ConnectionOptions = {
	direction: Direction;
	remoteAddress: string;
};

// Creates a connection around an accepted or dialed socket; bound under Identifiers.P2P.WebSocket.Connection.Factory.
export type ConnectionFactory = (ws: WebSocket, options: ConnectionOptions) => Connection;

// Answers requests from the peer; set by the transport. Throwing yields a 500 with an empty payload.
export type RequestHandler = (path: string, payload: Buffer) => Promise<Response>;

// The public surface of a live connection, as routes, middleware and the p2p layer see it.
export interface Connection {
	readonly direction: Direction;
	readonly remoteAddress: string;
	readonly state: ConnectionState;

	// Answers requests from the peer; set by the transport when the connection is created.
	onRequest?: RequestHandler;

	// Transport lifecycle: runs the handshake, or refuses the socket with a reason the peer gets to see.
	open(): Promise<void>;
	reject(reason: CloseReason): void;

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

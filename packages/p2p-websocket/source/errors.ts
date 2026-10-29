import type { CloseReason } from "./enums.js";

export class ConnectionError extends Error {
	public constructor(
		public readonly reason: CloseReason,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "ConnectionError";
	}
}

// Thrown by a route or a middleware step to answer with a status code other than 200.
export class RequestError extends Error {
	public constructor(
		public readonly statusCode: number,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "RequestError";
	}
}

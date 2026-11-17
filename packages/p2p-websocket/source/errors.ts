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

// Thrown by the router, a route or a middleware step to answer with a status code other than 200.
// With `closeReason` the request was the peer's fault and the connection is closed as well.
export class RequestError extends Error {
	public readonly closeReason?: CloseReason;

	public constructor(
		public readonly statusCode: number,
		message: string,
		options?: { cause?: unknown; closeReason?: CloseReason },
	) {
		super(message, { cause: options?.cause });
		this.name = "RequestError";
		this.closeReason = options?.closeReason;
	}
}

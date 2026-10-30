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

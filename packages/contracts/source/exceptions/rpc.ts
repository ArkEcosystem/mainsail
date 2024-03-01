import { Exception } from "./base";

export class RpcError extends Exception {
	public constructor(
		message: string,
		public code: number = -32_000,
	) {
		super(message);
	}
}

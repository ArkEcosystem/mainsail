import { Exception } from "./base.js";
import type { Contracts } from "@mainsail/contracts";
import { Enums } from "@mainsail/constants";

export class RpcError extends Exception {
	public constructor(
		message: string,
		public code: Contracts.Api.RPC.ErrorCode = Enums.Rpc.ErrorCode.RpcServerError,
	) {
		super(message);
	}
}

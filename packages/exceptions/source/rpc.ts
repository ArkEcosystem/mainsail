import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";

import { Exception } from "./base.js";

export class RpcError extends Exception {
	public constructor(
		message: string,
		public data?: string,
		public code: Contracts.Api.RPC.ErrorCode = Enums.Api.RcpErrorCode.RpcServerError,
	) {
		super(message);
	}
}

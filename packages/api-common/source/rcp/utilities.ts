import type { Request } from "@hapi/hapi";
import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";

export const getRcpId = (request: Request): Contracts.Api.RPC.Id => {
	const payload = request.payload as Record<string, unknown>;

	if (payload && typeof payload === "object") {
		const { id } = payload;

		if (typeof id === "string" || typeof id === "number") {
			return id;
		}
	}

	// eslint-disable-next-line unicorn/no-null
	return null;
};

export const errorMessageMap = {
	[Enums.Api.RcpErrorCode.InternalError]: "Internal error",
	[Enums.Api.RcpErrorCode.InvalidParameters]: "Invalid params",
	[Enums.Api.RcpErrorCode.InvalidRequest]: "Invalid request",
	[Enums.Api.RcpErrorCode.MethodNotFound]: "Method not found",
	[Enums.Api.RcpErrorCode.ParseError]: "Parse error",
};

export const prepareRcpError = (
	id: Contracts.Api.RPC.Id,
	errorCode: Contracts.Api.RPC.ErrorCode,
	message?: string,
	data?: string,
): Contracts.Api.RPC.Error => ({
	error: {
		code: errorCode,
		data,
		message: message ?? errorMessageMap[errorCode],
	},
	id,
	jsonrpc: "2.0",
});

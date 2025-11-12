import { Request } from "@hapi/hapi";
import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

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
	[Enums.Api.ErrorCode.ParseError]: "Parse error",
	[Enums.Api.ErrorCode.InvalidRequest]: "Invalid request",
	[Enums.Api.ErrorCode.MethodNotFound]: "Method not found",
	[Enums.Api.ErrorCode.InvalidParameters]: "Invalid params",
	[Enums.Api.ErrorCode.InternalError]: "Internal error",
};

export const prepareRcpError = (
	id: Contracts.Api.RPC.Id,
	errorCode: Contracts.Api.RPC.ErrorCode,
	message?: string,
): Contracts.Api.RPC.Error => ({
	error: {
		code: errorCode,
		message: message ?? errorMessageMap[errorCode],
	},
	id,
	jsonrpc: "2.0",
});

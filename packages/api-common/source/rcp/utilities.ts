import { Request } from "@hapi/hapi";
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
	[Enums.Rpc.ErrorCode.ParseError]: "Parse error",
	[Enums.Rpc.ErrorCode.InvalidRequest]: "Invalid request",
	[Enums.Rpc.ErrorCode.MethodNotFound]: "Method not found",
	[Enums.Rpc.ErrorCode.InvalidParameters]: "Invalid params",
	[Enums.Rpc.ErrorCode.InternalError]: "Internal error",
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

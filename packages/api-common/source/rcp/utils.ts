import { Request } from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

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
	[Contracts.Api.RPC.ErrorCode.ParseError]: "Parse error",
	[Contracts.Api.RPC.ErrorCode.InvalidRequest]: "Invalid request",
	[Contracts.Api.RPC.ErrorCode.MethodNotFound]: "Method not found",
	[Contracts.Api.RPC.ErrorCode.InvalidParameters]: "Invalid params",
	[Contracts.Api.RPC.ErrorCode.InternalError]: "Internal error",
};

export const prepareRcpError = (
	id: Contracts.Api.RPC.Id,
	errorCode: Contracts.Api.RPC.ErrorCode,
): Contracts.Api.RPC.Error => ({
	jsonrpc: "2.0",
	// eslint-disable-next-line sort-keys-fix/sort-keys-fix
	id,
	// eslint-disable-next-line sort-keys-fix/sort-keys-fix
	error: {
		code: errorCode,
		message: errorMessageMap[errorCode],
	},
});

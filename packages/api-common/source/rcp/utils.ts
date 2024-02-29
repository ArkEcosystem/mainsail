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

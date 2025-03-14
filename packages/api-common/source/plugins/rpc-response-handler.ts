import { Boom } from "@hapi/boom";
import { ResponseObject, Server as HapiServer } from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

import { Utils as Utilities } from "../rcp/index.js";

const responseIsBoom = (response: ResponseObject | Boom): response is Boom => !!(response as Boom).isBoom;

export const rpcResponseHandler = {
	name: "rcpResponseHandler",
	register: (server: HapiServer) => {
		server.ext({
			method(request, h) {
				const response = request.response;

				if (responseIsBoom(response) && request.method === "post" && request.path === "") {
					return h.response(
						Utilities.prepareRcpError(
							Utilities.getRcpId(request),
							Contracts.Api.RPC.ErrorCode.InternalError,
							response.output.payload.message,
						),
					);
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};

import { Boom } from "@hapi/boom";
import { ResponseObject, Server as HapiServer } from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

import { Utils } from "../rcp/index.js";

const responseIsBoom = (response: ResponseObject | Boom): response is Boom => !!(response as Boom).isBoom;

export const rpcResponseHandler = {
	name: "rcpResponseHandler",
	register: (server: HapiServer) => {
		server.ext({
			method(request, h) {
				const response = request.response;

				if (responseIsBoom(response)) {
					return h.response(
						Utils.prepareRcpError(Utils.getRcpId(request), Contracts.Api.RPC.ErrorCode.InternalError),
					);
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};

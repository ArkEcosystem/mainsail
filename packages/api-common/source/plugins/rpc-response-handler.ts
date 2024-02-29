import { Boom } from "@hapi/boom";
import { Request, ResponseObject, Server as HapiServer } from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

import { Utils } from "../rcp";

const prepareErrorResponse = (request: Request, response: Boom): Contracts.Api.RPC.Error => ({
	error: {
		code: -32_603,
		message: "Internal error",
	},
	id: Utils.getRcpId(request),
	jsonrpc: "2.0",
});

const responseIsBoom = (response: ResponseObject | Boom): response is Boom => !!(response as Boom).isBoom;

export const rpcResponseHandler = {
	name: "rcpResponseHandler",
	register: (server: HapiServer) => {
		server.ext({
			method(request, h) {
				const response = request.response;

				if (responseIsBoom(response)) {
					return h.response(prepareErrorResponse(request, response));
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};

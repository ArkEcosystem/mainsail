import type { Boom } from "@hapi/boom";
import type Hapi from "@hapi/hapi";
import type { ResponseObject, Server as HapiServer } from "@hapi/hapi";
import { Enums } from "@mainsail/constants";

import { Utils as Utilities } from "../rcp/index.js";

const responseIsBoom = (response: ResponseObject | Boom): response is Boom => !!(response as Boom).isBoom;

export const rpcResponseHandler = {
	name: "rcpResponseHandler",
	register: (server: HapiServer): void => {
		server.ext({
			method(request: Hapi.Request, h: Hapi.ResponseToolkit) {
				const response = request.response;

				if (responseIsBoom(response) && request.method === "post" && request.path === "") {
					return h.response(
						Utilities.prepareRcpError(
							Utilities.getRcpId(request),
							Enums.Api.RcpErrorCode.InternalError,
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

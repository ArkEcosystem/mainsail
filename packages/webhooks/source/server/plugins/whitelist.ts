import Boom from "@hapi/boom";
import type Hapi from "@hapi/hapi";
import { isWhitelisted } from "@mainsail/utils";

export const whitelist = {
	name: "whitelist",
	register(server: Hapi.Server, options: { whitelist: string[] }): void {
		server.ext({
			async method(request: Hapi.Request, h: Hapi.ResponseToolkit) {
				if (!options.whitelist) {
					return h.continue;
				}

				if (isWhitelisted(options.whitelist, request.info.remoteAddress)) {
					return h.continue;
				}

				return Boom.forbidden();
			},
			type: "onRequest",
		});
	},
	version: "0.1.0",
};

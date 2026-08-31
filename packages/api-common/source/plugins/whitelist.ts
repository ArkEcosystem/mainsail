import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import { isWhitelisted } from "@mainsail/utils";

import { getIp } from "../utils/index.js";

export const whitelist = {
	name: "whitelist",
	register(server: Hapi.Server, options: { whitelist: string[]; trustProxy: boolean }): void {
		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!options.whitelist) {
					return h.continue;
				}

				if (isWhitelisted(options.whitelist, getIp(request, options.trustProxy))) {
					return h.continue;
				}

				return Boom.forbidden();
			},
			type: "onRequest",
		});
	},
	version: "0.1.0",
};

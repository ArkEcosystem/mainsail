import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import { IpAddress, isWhitelisted } from "@mainsail/utils";

import { getIp } from "../utils/index.js";

export const whitelist = {
	name: "whitelist",
	register(server: Hapi.Server, options: { whitelist: string[]; trustProxy: boolean }): void {
		const whitelist = options.whitelist && IpAddress.canonicalPatterns(options.whitelist);

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!whitelist) {
					return h.continue;
				}

				if (isWhitelisted(whitelist, getIp(request, options.trustProxy))) {
					return h.continue;
				}

				return Boom.forbidden();
			},
			type: "onRequest",
		});
	},
	version: "0.1.0",
};

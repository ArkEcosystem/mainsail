import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import { IpAddress, isWhitelisted } from "@mainsail/utils";

export const whitelist = {
	name: "whitelist",
	register(server: Hapi.Server, options: { whitelist: string[] }): void {
		const whitelist = options.whitelist && IpAddress.canonicalPatterns(options.whitelist);

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!whitelist) {
					return h.continue;
				}

				const ip = IpAddress.canonicalAddress(request.info.remoteAddress);

				if (ip && isWhitelisted(whitelist, ip)) {
					return h.continue;
				}

				return Boom.forbidden();
			},
			type: "onRequest",
		});
	},
	version: "0.1.0",
};

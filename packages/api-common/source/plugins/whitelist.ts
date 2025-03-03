import Boom from "@hapi/boom";
import { isWhitelisted } from "@mainsail/utils";

import { getIp } from "../utils/index.js";

export const whitelist = {
	name: "whitelist",
	register(server, options) {
		server.ext({
			async method(request, h) {
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

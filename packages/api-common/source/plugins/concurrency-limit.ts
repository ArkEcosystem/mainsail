import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";

type Options = {
	limit: number;
};

const slot = "concurrency-limit";

export const isLimited = (request: Hapi.Request): boolean =>
	request.route.settings.plugins?.["concurrencyLimit"]?.enabled === true;

export const concurrencyLimit = {
	name: "concurrency-limit",
	once: true,
	async register(server: Hapi.Server, options: Options): Promise<void> {
		if (options.limit === 0) {
			return;
		}

		const { payload, statusCode } = Boom.serverUnavailable("Too many concurrent requests").output;
		let active = 0;

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!isLimited(request)) {
					return h.continue;
				}

				if (active >= options.limit) {
					return h.response(payload).code(statusCode).takeover();
				}

				active++;
				request.plugins[slot] = true;

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			if (request.plugins[slot]) {
				active--;
			}
		});
	},
	version: "1.0.0",
};

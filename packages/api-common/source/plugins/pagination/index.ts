// Based on https://github.com/fknop/hapi-pagination

import { getConfig } from "./config.js";
import { Extension } from "./extension.js";

export const pagination = {
	name: "hapi-pagination",
	register(server, options) {
		const { error, config } = getConfig(options);

		if (error) {
			throw error;
		}

		const extension = new Extension(config);

		server.ext("onPreHandler", (request, h) => extension.onPreHandler(request, h));
		server.ext("onPostHandler", (request, h) => extension.onPostHandler(request, h));
	},
	version: "1.0.0",
};

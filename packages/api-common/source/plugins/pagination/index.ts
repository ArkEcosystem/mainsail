// Based on https://github.com/fknop/hapi-pagination

import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import type Joi from "joi";

import { getConfig } from "./config.js";
import { Extension } from "./extension.js";

export const pagination = {
	name: "hapi-pagination",
	register(server: Contracts.Api.ApiServer, options: Joi.ValidationOptions): void {
		const { error, config } = getConfig(options);

		if (error) {
			throw error;
		}

		assert.defined(config);
		const extension = new Extension(config);

		server.ext("onPreHandler", (request, h) => extension.onPreHandler(request, h));
		server.ext("onPostHandler", (request, h) => extension.onPostHandler(request, h));
	},
	version: "1.0.0",
};

// Based on https://github.com/fknop/hapi-pagination

import type { Contracts } from "@mainsail/contracts";
import type Joi from "joi";

import { assert } from "@mainsail/utils";

import type { HapiRequest } from "../../types.js";

import { getConfig } from "./config.js";
import { Extension } from "./extension.js";

export const pagination = {
	name: "hapi-pagination",
	register(server: Contracts.Api.ApiServer, options: Joi.ValidationOptions): void {
		const { config, error } = getConfig(options);

		if (error) {
			throw error;
		}

		assert.defined(config);
		const extension = new Extension(config);

		server.ext("onPreHandler", (request, h) => extension.onPreHandler(request as unknown as HapiRequest, h));
		server.ext("onPostHandler", (request, h) => extension.onPostHandler(request as unknown as HapiRequest, h));
	},
	version: "1.0.0",
};

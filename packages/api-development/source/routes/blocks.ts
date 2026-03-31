import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { BlocksController } from "../controllers/blocks.js";
import { blockId, pagination } from "../schemas.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(BlocksController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}).concat(pagination),
			},
		},
		path: "/blocks",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.first(request),
		method: "GET",
		options: {
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/blocks/first",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.last(request),
		method: "GET",
		options: {
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/blocks/last",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					id: blockId,
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/blocks/{id}",
	});
};

import Hapi from "@hapi/hapi";
import Joi from "joi";

import { BlocksController } from "../controllers/blocks";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(BlocksController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/blocks",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),

					/* TODO */
					// ...server.app.schemas.blockCriteriaSchemas,
					// orderBy: server.app.schemas.blocksOrderBy,
					// .concat(blockSortingSchema)
				}).concat(pagination),
			},
		},
	});

	server.route({
		handler: (request: Hapi.Request) => controller.first(request),
		method: "GET",
		path: "/blocks/first",
		options: {
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
	});

	server.route({
		handler: (request: Hapi.Request) => controller.last(request),
		method: "GET",
		path: "/blocks/last",
		options: {
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		path: "/blocks/{id}",
		options: {
			validate: {
				params: Joi.object({
					id: server.app.schemas.blockId,
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactions(request),
		method: "GET",
		path: "/blocks/{id}/transactions",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: Joi.string(),
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}).concat(pagination),
			},
		},
	});
};

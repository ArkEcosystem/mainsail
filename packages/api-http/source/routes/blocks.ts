import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { BlocksController } from "../controllers/blocks";
import { blockSortingSchema, transactionSortingSchema } from "../schemas";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(BlocksController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					...server.app.schemas.blockCriteriaSchemas,
					orderBy: server.app.schemas.blocksOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(blockSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/blocks",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.first(request),
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
		handler: (request: Hapi.Request) => controller.last(request),
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
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
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
		path: "/blocks/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactions(request),
		method: "GET",
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
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/blocks/{id}/transactions",
	});
};

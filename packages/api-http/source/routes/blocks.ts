import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { BlocksController } from "../controllers/blocks.js";
import {
	blockCriteriaSchemas,
	blockHash,
	blocksOrderBy,
	blockSortingSchema,
	transactionCriteriaSchemas,
	transactionsOrderBy,
	transactionSortingSchema,
} from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
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
					...blockCriteriaSchemas,
					orderBy: blocksOrderBy,
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
				query: Joi.object({}),
			},
		},
		path: "/blocks/first",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.last(request),
		method: "GET",
		options: {
			validate: {
				query: Joi.object({}),
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
					id: blockHash,
				}),
				query: Joi.object({}),
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
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/blocks/{id}/transactions",
	});
};

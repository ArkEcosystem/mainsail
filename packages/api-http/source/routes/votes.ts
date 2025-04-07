import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { VotesController } from "../controllers/votes.js";
import { transactionHashSchema, transactionSortingSchema } from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(VotesController);
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
					...server.app.schemas.transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/votes",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			plugins: {},
			validate: {
				params: Joi.object({
					hash: transactionHashSchema,
				}),
				query: Joi.object({
					fullReceipt: Joi.bool().default(false),
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/votes/{hash}",
	});
};

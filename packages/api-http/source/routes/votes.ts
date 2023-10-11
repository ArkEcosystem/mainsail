import Hapi from "@hapi/hapi";
import { Contracts, Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { VotesController } from "../controllers/votes";
import { transactionIdSchema, transactionSortingSchema } from "../schemas";

export const register = (server: Contracts.ApiServer): void => {
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
					id: transactionIdSchema,
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/votes/{id}",
	});
};

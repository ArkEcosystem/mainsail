import Hapi from "@hapi/hapi";
import Joi from "joi";

import { VotesController } from "../controllers/votes";
import { pagination, transactionIdSchema, transactionSortingSchema } from "../schemas";

export const register = (server: Hapi.Server): void => {
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
					.concat(pagination),
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

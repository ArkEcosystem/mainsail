import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions.js";
import { transactionCriteriaSchemas, transactionsOrderBy, transactionSortingSchema } from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TransactionsController);
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
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/transactions",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					hash: Joi.string().hex().length(64),
				}),
				query: Joi.object({
					fullReceipt: Joi.bool().default(false),
				}),
			},
		},
		path: "/transactions/{hash}",
	});
};

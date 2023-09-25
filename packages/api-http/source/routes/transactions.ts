import Hapi from "@hapi/hapi";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions";
import { pagination, transactionSortingSchema } from "../schemas";

export const register = (server: Hapi.Server): void => {
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
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(transactionSortingSchema)
					.concat(pagination),
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
					// TODO: length depends on hash size...
					id: Joi.string().hex() /* .length(64), */,
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/transactions/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.unconfirmed(request),
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
		path: "/transactions/unconfirmed",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.showUnconfirmed(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					// TODO: length depends on hash size...
					id: Joi.string().hex() /* .length(64), */,
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/transactions/unconfirmed/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.types(request),
		method: "GET",
		path: "/transactions/types",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.schemas(request),
		method: "GET",
		path: "/transactions/schemas",
	});
};

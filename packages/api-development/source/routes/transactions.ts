import Hapi from "@hapi/hapi";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions.js";
import { pagination } from "../schemas.js";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

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
					id: Joi.string().hex().length(64),
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

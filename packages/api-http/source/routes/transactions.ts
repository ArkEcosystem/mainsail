import Hapi from "@hapi/hapi";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/transactions",
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
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		path: "/transactions/{id}",
		options: {
			validate: {
				params: Joi.object({
					// TODO: length depends on hash size...
					id: Joi.string().hex(), /* .length(64), */
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
	});

	server.route({
		handler: (request: Hapi.Request) => controller.unconfirmed(request),
		method: "GET",
		path: "/transactions/unconfirmed",
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
	});

	server.route({
		handler: (request: Hapi.Request) => controller.showUnconfirmed(request),
		method: "GET",
		path: "/transactions/unconfirmed/{id}",
		options: {
			validate: {
				params: Joi.object({
					// TODO: length depends on hash size...
					id: Joi.string().hex(), /* .length(64), */
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
			},
		},
	});

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.types(request),
	// 	method: "GET",
	// 	path: "/transactions/types",
	// });

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.schemas(request),
	// 	method: "GET",
	// 	path: "/transactions/schemas",
	// });

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.store(request),
	// 	method: "POST",
	// 	options: {
	// 		plugins: {
	// 			"hapi-ajv": {
	// 				payloadSchema: {
	// 					additionalProperties: false,
	// 					properties: {
	// 						transactions: {
	// 							$ref: "transactions",
	// 							maxItems: server.app.app
	// 								.getTagged<Providers.PluginConfiguration>(
	// 									Identifiers.PluginConfiguration,
	// 									"plugin",
	// 									"transaction-pool",
	// 								)
	// 								.get<number>("maxTransactionsPerRequest"),
	// 							minItems: 1,
	// 						},
	// 					},
	// 					required: ["transactions"],
	// 					type: "object",
	// 				},
	// 			},
	// 		},
	// 	},
	// 	path: "/transactions",
	// });
};

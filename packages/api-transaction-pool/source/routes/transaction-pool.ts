import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { TransactionsController } from "../controllers/transaction-pool";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.store(request),
		method: "POST",
		options: {
			plugins: {
				"hapi-ajv": {
					payloadSchema: {
						additionalProperties: false,
						properties: {
							transactions: {
								$ref: "transactions",
								maxItems: server.app.app
									.getTagged<Providers.PluginConfiguration>(
										Identifiers.PluginConfiguration,
										"plugin",
										"transaction-pool",
									)
									.get<number>("maxTransactionsPerRequest"),
								minItems: 1,
							},
						},
						required: ["transactions"],
						type: "object",
					},
				},
			},
		},
		path: "/transaction-pool",
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
				}).concat(Schemas.pagination),
			},
		},
		path: "/transaction-pool/unconfirmed",
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
		path: "/transaction-pool/unconfirmed/{id}",
	});
};

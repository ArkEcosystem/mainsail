import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { TransactionsController } from "../controllers/transaction-pool";

export const register = (server: Contracts.ApiServer): void => {
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
};

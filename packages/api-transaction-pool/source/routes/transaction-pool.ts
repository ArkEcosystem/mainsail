import Hapi from "@hapi/hapi";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { TransactionsController } from "../controllers/transaction-pool";

export const register = (server: Contracts.Api.ApiServer): void => {
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
								items: {
									allOf: [{ $ref: "hex" }, { maxLength: 4096 /* arbitrary cap */ }],
									maxItems: server.app.app
										.getTagged<Providers.PluginConfiguration>(
											Identifiers.PluginConfiguration,
											"plugin",
											"transaction-pool",
										)
										.get<number>("maxTransactionsPerRequest"),
									minItems: 1,
									type: "array",
								},
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

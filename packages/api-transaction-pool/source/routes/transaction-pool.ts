import Hapi from "@hapi/hapi";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { TransactionsController } from "../controllers/transaction-pool";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

	const maxTransactionsPerRequest = server.app.app
		.getTagged<Providers.PluginConfiguration>(Identifiers.PluginConfiguration, "plugin", "transaction-pool")
		.getRequired<number>("maxTransactionsPerRequest");

	const maxTransactionBytes = server.app.app
		.getTagged<Providers.PluginConfiguration>(Identifiers.PluginConfiguration, "plugin", "transaction-pool")
		.getRequired<number>("maxTransactionBytes");

	server.route({
		handler: (request: Hapi.Request) => controller.store(request),
		method: "POST",
		options: {
			payload: {
				maxBytes: 100 + maxTransactionsPerRequest * maxTransactionBytes * 2,
			},
			validate: {
				payload: Joi.object({
					transactions: Joi.array()
						.items(
							Joi.string()
								.lowercase()
								.hex()
								.max(maxTransactionBytes * 2),
						)
						.min(1)
						.max(maxTransactionsPerRequest),
				}),
			},
		},
		path: "/transaction-pool",
	});
};

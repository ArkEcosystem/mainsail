import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Schemas } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions.js";
import { pagination } from "../schemas.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

	const maxTransactionsPerRequest = server.app.app
		.getTagged<Contracts.Kernel.PluginConfiguration>(
			Identifiers.ServiceProvider.Configuration,
			"plugin",
			"transaction-pool-service",
		)
		.getRequired<number>("maxTransactionsPerRequest");

	const maxTransactionBytes = server.app.app
		.getTagged<Contracts.Kernel.PluginConfiguration>(
			Identifiers.ServiceProvider.Configuration,
			"plugin",
			"transaction-pool-service",
		)
		.getRequired<number>("maxTransactionBytes");

	server.route({
		handler: (request: Types.HapiRequest) => controller.store(request),
		method: "POST",
		options: {
			payload: {
				// Each transaction is hex encoded (2 chars per byte) and carries ~4 bytes
				// of JSON overhead (quotes and comma), plus 100 bytes for the envelope.
				maxBytes: 100 + maxTransactionsPerRequest * (maxTransactionBytes * 2 + 4),
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
						.max(maxTransactionsPerRequest)
						.required(),
				}),
			},
		},
		path: "/transactions",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.unconfirmed(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					address: Schemas.orEqualCriteria(Schemas.addressSchema),
					from: Schemas.orEqualCriteria(Schemas.addressSchema),
					to: Schemas.orEqualCriteria(Schemas.addressSchema),
				}).concat(pagination),
			},
		},
		path: "/transactions/unconfirmed",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.showUnconfirmed(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					// The pool stores hashes lowercase; accept any casing like the address filters do.
					hash: Joi.string().lowercase().hex().length(64),
				}),
			},
		},
		path: "/transactions/unconfirmed/{hash}",
	});
};

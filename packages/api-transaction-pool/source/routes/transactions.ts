import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Schemas } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import Joi from "joi";

import { TransactionsController } from "../controllers/transactions.js";

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

	const isPeer = (ip: string): boolean =>
		server.app.app
			.get<Contracts.TransactionPool.PeerRepository>(Identifiers.TransactionPool.Peer.Repository)
			.hasPeer(ip);

	server.route({
		handler: (request: Types.HapiRequest) => controller.store(request),
		method: "POST",
		options: {
			payload: {
				// Each transaction is hex encoded (2 chars per byte) and carries ~4 bytes
				// of JSON overhead (quotes and comma), plus 100 bytes for the envelope.
				maxBytes: 100 + maxTransactionsPerRequest * (maxTransactionBytes * 2 + 4),
			},
			plugins: {
				rateLimit: {
					points: (request: Types.HapiRequest, ip: string) =>
						isPeer(ip) ? 1 : (request.payload as { transactions: string[] }).transactions.length,
				},
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
				concurrencyLimit: {
					enabled: true,
				},
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					address: Schemas.orEqualCriteria(Schemas.addressSchema),
					from: Schemas.orEqualCriteria(Schemas.addressSchema),
					to: Schemas.orEqualCriteria(Schemas.addressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/transactions/unconfirmed",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.showUnconfirmed(request),
		method: "GET",
		options: {
			plugins: {
				concurrencyLimit: {
					enabled: true,
				},
			},
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

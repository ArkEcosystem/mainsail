import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { WalletsController } from "../controllers/wallets.js";
import {
	transactionCriteriaSchemas,
	transactionsOrderBy,
	transactionSortingSchema,
	walletCriteriaSchemaObject,
	walletId,
	walletParamSchema as walletParameterSchema,
	walletSortingSchema,
} from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(WalletsController);
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
					...walletCriteriaSchemaObject,
				})
					.concat(walletSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.top(request),
		method: "GET",
		options: {
			plugins: {
				pagination: { enabled: true },
			},
			validate: {
				query: Joi.object({
					...walletCriteriaSchemaObject,
				})
					.concat(walletSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/top",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					id: walletParameterSchema,
				}),
				query: Joi.object({}),
			},
		},
		path: "/wallets/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactions(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: walletId,
				}),
				query: Joi.object({
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactionsSent(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: walletId,
				}),
				query: Joi.object({
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions/sent",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactionsReceived(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: walletId,
				}),
				query: Joi.object({
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions/received",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.votes(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: walletId,
				}),
				query: Joi.object({
					...transactionCriteriaSchemas,
					fullReceipt: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/votes",
	});

	// TODO: locks
};

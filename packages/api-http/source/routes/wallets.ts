import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { WalletsController } from "../controllers/wallets.js";
import {
	transactionSortingSchema,
	walletCriteriaSchemaObject,
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
					transform: Joi.bool().default(true),
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
					transform: Joi.bool().default(true),
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
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
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
					id: server.app.schemas.walletId,
				}),
				query: Joi.object({
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
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
					id: server.app.schemas.walletId,
				}),
				query: Joi.object({
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
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
					id: server.app.schemas.walletId,
				}),
				query: Joi.object({
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
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
					id: server.app.schemas.walletId,
				}),
				query: Joi.object({
					...server.app.schemas.transactionCriteriaSchemas,
					orderBy: server.app.schemas.transactionsOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/votes",
	});

	// TODO: locks
};

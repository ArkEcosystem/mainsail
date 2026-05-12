import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { WalletsController } from "../controllers/wallets.js";
import {
	address,
	tokenBalanceSchema,
	tokenNameSchema,
	transactionCriteriaSchemas,
	transactionsOrderBy,
	transactionSortingSchema,
	walletAddressSchema,
	walletCriteriaSchemaObject,
	walletId,
	walletParamSchema as walletParameterSchema,
	walletSortingSchema,
} from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(WalletsController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.index(request),
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
		handler: (request: Types.HapiRequest) => controller.top(request),
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
		handler: (request: Types.HapiRequest) => controller.activity(request),
		method: "GET",
		options: {
			plugins: {
				pagination: { enabled: true },
			},
			validate: {
				query: Joi.object({
					addresses: Schemas.orEqualCriteria(walletAddressSchema).required(),
					blacklist: Schemas.orEqualCriteria(walletAddressSchema),
					ignoreWhitelist: Joi.bool().default(false),
					whitelist: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/wallets/activity",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.show(request),
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
		handler: (request: Types.HapiRequest) => controller.transactions(request),
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
					includeTokens: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.transactionsSent(request),
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
					includeTokens: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions/sent",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.transactionsReceived(request),
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
					includeTokens: Joi.bool().default(false),
					orderBy: transactionsOrderBy,
				})
					.concat(transactionSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/transactions/received",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.votes(request),
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

	server.route({
		handler: (request: Types.HapiRequest) => controller.tokens(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					addresses: Schemas.orEqualCriteria(walletAddressSchema),
					blacklist: Schemas.orEqualCriteria(walletAddressSchema),
					ignoreWhitelist: Joi.bool().default(false),
					minBalance: Schemas.orNumericCriteria(tokenBalanceSchema),
					name: Schemas.orEqualCriteria(tokenNameSchema),
					whitelist: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/wallets/tokens",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.tokensShow(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: walletParameterSchema,
				}),
				query: Joi.object({
					blacklist: Schemas.orEqualCriteria(walletAddressSchema),
					ignoreWhitelist: Joi.bool().default(false),
					minBalance: Schemas.orNumericCriteria(tokenBalanceSchema),
					name: Schemas.orEqualCriteria(tokenNameSchema),
					tokenAddress: Schemas.orEqualCriteria(address),
					whitelist: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/wallets/{id}/tokens",
	});
};

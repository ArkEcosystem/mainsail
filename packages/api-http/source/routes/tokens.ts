import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { TokensController } from "../controllers/tokens.js";
import { address } from "../schemas/schemas.js";
import { tokenNameSchema } from "../schemas/tokens.js";
import { transactionHashSchema } from "../schemas/transactions.js";
import { walletAddressSchema } from "../schemas/wallets.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TokensController);
	server.bind(controller);

	const tokensQuerySchema = Joi.object({
		ignoreWhitelist: Joi.bool().default(false),
		name: Schemas.orEqualCriteria(tokenNameSchema),
	}).concat(Schemas.pagination);

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
				query: tokensQuerySchema,
			},
		},
		path: "/tokens",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "POST",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				payload: Joi.object({
					whitelist: Joi.array().items(Schemas.addressSchema).max(100).empty(null).default([]),
				}).empty(null),
				query: tokensQuerySchema,
			},
		},
		path: "/tokens",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transfers(request),
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
					from: Schemas.orEqualCriteria(walletAddressSchema),
					to: Schemas.orEqualCriteria(walletAddressSchema),
					transactionHash: Schemas.orEqualCriteria(transactionHashSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens/transfers",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.whitelist(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Schemas.pagination,
			},
		},
		path: "/tokens/whitelist",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					address,
				}),
			},
		},
		path: "/tokens/{address}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.tokenTransfers(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					address,
				}),
				query: Joi.object({
					from: Schemas.orEqualCriteria(walletAddressSchema),
					to: Schemas.orEqualCriteria(walletAddressSchema),
					transactionHash: Schemas.orEqualCriteria(transactionHashSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens/{address}/transfers",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.holders(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					address,
				}),
			},
		},
		path: "/tokens/{address}/holders",
	});
};

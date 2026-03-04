import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { TokensController } from "../controllers/tokens.js";
import { address } from "../schemas/schemas.js";
import { tokenNameSchema, tokenWhitelistPayloadSchema } from "../schemas/tokens.js";
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
				payload: tokenWhitelistPayloadSchema,
				query: tokensQuerySchema,
			},
		},
		path: "/tokens",
	});

	const tokensTransfersQuerySchema = Joi.object({
		ignoreWhitelist: Joi.bool().default(false),
		from: Schemas.orEqualCriteria(walletAddressSchema),
		to: Schemas.orEqualCriteria(walletAddressSchema),
		transactionHash: Schemas.orEqualCriteria(transactionHashSchema),
	}).concat(Schemas.pagination);

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
				query: tokensTransfersQuerySchema.concat(
					Joi.object({
						addresses: Schemas.orEqualCriteria(walletAddressSchema),
					}),
				),
			},
		},
		path: "/tokens/transfers",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transfers(request),
		method: "POST",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				payload: tokenWhitelistPayloadSchema,
				query: tokensTransfersQuerySchema.concat(
					Joi.object({
						addresses: Schemas.orEqualCriteria(walletAddressSchema),
					}),
				),
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
				query: tokensTransfersQuerySchema,
			},
		},
		path: "/tokens/{address}/transfers",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.tokenTransfers(request),
		method: "POST",
		options: {
			validate: {
				params: Joi.object({
					address,
				}),
				payload: tokenWhitelistPayloadSchema,
				query: tokensTransfersQuerySchema,
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

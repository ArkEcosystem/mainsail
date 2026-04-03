import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { TokensController } from "../controllers/tokens.js";
import { address } from "../schemas/schemas.js";
import { tokenNameSchema } from "../schemas/tokens.js";
import { transactionHashSchema } from "../schemas/transactions.js";
import { walletAddressSchema } from "../schemas/wallets.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TokensController);
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
					ignoreWhitelist: Joi.bool().default(false),
					name: Schemas.orEqualCriteria(tokenNameSchema),
					whitelist: Schemas.orEqualCriteria(Schemas.addressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.transfers(request),
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
					ignoreWhitelist: Joi.bool().default(false),
					to: Schemas.orEqualCriteria(walletAddressSchema),
					transactionHash: Schemas.orEqualCriteria(transactionHashSchema),
					whitelist: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens/transfers",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.approvals(request),
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
					whitelist: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens/approvals",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.whitelist(request),
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
		handler: (request: Types.HapiRequest) => controller.show(request),
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
		handler: (request: Types.HapiRequest) => controller.tokenTransfers(request),
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
		handler: (request: Types.HapiRequest) => controller.tokenApprovals(request),
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
		path: "/tokens/{address}/approvals",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.holders(request),
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

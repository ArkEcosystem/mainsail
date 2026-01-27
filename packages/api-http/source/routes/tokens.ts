import type Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { TokensController } from "../controllers/tokens.js";
import { address } from "../schemas/schemas.js";
import { tokenNameSchema } from "../schemas/tokens.js";
import { walletAddressSchema } from "../schemas/wallets.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TokensController);
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
					name: Schemas.orEqualCriteria(tokenNameSchema),
				}).concat(Schemas.pagination),
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
					from: Schemas.orEqualCriteria(walletAddressSchema),
					to: Schemas.orEqualCriteria(walletAddressSchema),
				}).concat(Schemas.pagination),
			},
		},
		path: "/tokens/transfers",
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

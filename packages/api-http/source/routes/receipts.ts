import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ReceiptsController } from "../controllers/receipts.js";
import { address } from "../schemas/schemas.js";
import { transactionCriteriaSchemaObject } from "../schemas/transactions.js";
import { walletId } from "../schemas/wallets.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ReceiptsController);
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
					from: walletId,
					fullReceipt: Joi.bool().default(true),
					to: address,
					transactionHash: transactionCriteriaSchemaObject.hash,
				}).concat(Schemas.pagination),
			},
		},
		path: "/receipts",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					transactionHash: Joi.string().hex().length(64),
				}),
				query: Joi.object({
					fullReceipt: Joi.bool().default(true),
				}),
			},
		},
		path: "/receipts/{transactionHash}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.contracts(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					from: walletId,
					fullReceipt: Joi.bool().default(false),
				}).concat(Schemas.pagination),
			},
		},
		path: "/receipts/contracts",
	});
};

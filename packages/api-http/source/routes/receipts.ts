import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ReceiptsController } from "../controllers/receipts.js";
import { transactionCriteriaSchemaObject } from "../schemas/transactions.js";
import { walletId } from "../schemas/wallets.js";
import { address } from "../schemas/schemas.js";

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
					txHash: transactionCriteriaSchemaObject.id,
					recipient: address,
					sender: walletId,
				}).concat(Schemas.pagination),
			},
		},
		path: "/receipts",
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
					sender: walletId,
				}).concat(Schemas.pagination),
			},
		},
		path: "/receipts/contracts",
	});
};

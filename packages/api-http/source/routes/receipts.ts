import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ReceiptsController } from "../controllers/receipts.js";
import { transactionCriteriaSchemaObject } from "../schemas/transactions.js";
import { blockCriteriaSchemaObject } from "../schemas/blocks.js";

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
					blockHeight: blockCriteriaSchemaObject.height,
				}).concat(Schemas.pagination),
			},
		},
		path: "/receipts",
	});
};

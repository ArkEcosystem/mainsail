import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ValidatorsController } from "../controllers/validators.js";
import {
	blockSortingSchema,
	validatorCriteriaSchema,
	validatorSortingSchema,
	walletCriteriaSchema,
	walletParamSchema as walletParameterSchema,
	walletSortingSchema,
} from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ValidatorsController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: { enabled: true },
			},
			validate: {
				query: Joi.object()
					.concat(validatorCriteriaSchema)
					.concat(validatorSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/validators",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					id: walletParameterSchema,
				}),
			},
		},
		path: "/validators/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.voters(request),
		method: "GET",
		options: {
			plugins: {
				pagination: { enabled: true },
			},
			validate: {
				params: Joi.object({
					id: walletParameterSchema,
				}),
				query: Joi.object().concat(walletCriteriaSchema).concat(walletSortingSchema).concat(Schemas.pagination),
			},
		},
		path: "/validators/{id}/voters",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.blocks(request),
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
					...server.app.schemas.blockCriteriaSchemas,
					orderBy: server.app.schemas.blocksOrderBy,
					transform: Joi.bool().default(true),
				})
					.concat(blockSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/validators/{id}/blocks",
	});
};

import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { ValidatorsController } from "../controllers/validators.js";
import {
	blockCriteriaSchemas,
	blocksOrderBy,
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
		handler: (request: Types.HapiRequest) => controller.index(request),
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
		handler: (request: Types.HapiRequest) => controller.show(request),
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
		handler: (request: Types.HapiRequest) => controller.voters(request),
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
		handler: (request: Types.HapiRequest) => controller.blocks(request),
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
					...blockCriteriaSchemas,
					orderBy: blocksOrderBy,
				})
					.concat(blockSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/validators/{id}/blocks",
	});
};

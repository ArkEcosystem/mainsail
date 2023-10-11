import Hapi from "@hapi/hapi";
import { Contracts, Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { DelegatesController } from "../controllers/delegates";
import {
	blockSortingSchema,
	delegateCriteriaSchema,
	delegateSortingSchema,
	walletCriteriaSchema,
	walletParamSchema as walletParameterSchema,
	walletSortingSchema,
} from "../schemas";

export const register = (server: Contracts.ApiServer): void => {
	const controller = server.app.app.resolve(DelegatesController);
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
					.concat(delegateCriteriaSchema)
					.concat(delegateSortingSchema)
					.concat(Schemas.pagination),
			},
		},
		path: "/delegates",
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
		path: "/delegates/{id}",
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
		path: "/delegates/{id}/voters",
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
		path: "/delegates/{id}/blocks",
	});
};

import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ValidatorRoundsController } from "../controllers/validator-rounds.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ValidatorRoundsController);
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
				query: Joi.object({}).concat(Schemas.pagination),
			},
		},
		path: "/validator-rounds",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.delegates(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					id: Joi.number().integer().min(1),
				}),
			},
		},
		path: "/rounds/{id}/delegates",
	});
};

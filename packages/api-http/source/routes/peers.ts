import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { PeersController } from "../controllers/peers";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(PeersController);
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
					ip: Joi.string().ip({ version: ["ipv4", "ipV6"] }),
					orderBy: server.app.schemas.orderBy,
					transform: Joi.bool().default(true),
					version: Joi.string(),
				}).concat(Schemas.pagination),
			},
		},
		path: "/peers",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					ip: Joi.string().ip({ version: ["ipv4", "ipV6"] }),
					transform: Joi.bool().default(true),
				}),
			},
		},
		path: "/peers/{ip}",
	});
};

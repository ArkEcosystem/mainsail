import Hapi from "@hapi/hapi";
import Joi from "joi";

import { PeersController } from "../controllers/peers";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server): void => {
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
					version: Joi.string(),
				}).concat(pagination),
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
				}),
			},
		},
		path: "/peers/{ip}",
	});
};

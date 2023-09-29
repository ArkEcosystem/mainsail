import Hapi from "@hapi/hapi";
import Joi from "joi";

import { NodeController } from "../controllers/node";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(NodeController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.status(request),
		method: "GET",
		path: "/node/status",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.syncing(request),
		method: "GET",
		path: "/node/syncing",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.configuration(request),
		method: "GET",
		path: "/node/configuration",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.configurationCrypto(request),
		method: "GET",
		path: "/node/configuration/crypto",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.fees(request),
		method: "GET",
		options: {
			validate: {
				query: Joi.object({
					days: Joi.number().integer().min(1).max(30),
				}),
			},
		},
		path: "/node/fees",
	});
};

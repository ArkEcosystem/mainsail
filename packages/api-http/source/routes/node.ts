import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import Joi from "joi";

import { NodeController } from "../controllers/node.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(NodeController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.status(request),
		method: "GET",
		path: "/node/status",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.syncing(request),
		method: "GET",
		path: "/node/syncing",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.configuration(request),
		method: "GET",
		path: "/node/configuration",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.configurationCrypto(request),
		method: "GET",
		path: "/node/configuration/crypto",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.fees(request),
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

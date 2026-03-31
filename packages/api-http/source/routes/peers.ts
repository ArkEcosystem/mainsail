import type { Types } from "@mainsail/api-common";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { PeersController } from "../controllers/peers.js";
import { orderBy } from "../schemas/index.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(PeersController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					ip: Joi.string().ip({ version: ["ipv4", "ipv6"] }),
					orderBy: orderBy,
					version: Joi.string(),
				}).concat(Schemas.pagination),
			},
		},
		path: "/peers",
	});

	server.route({
		handler: (request: Types.HapiRequest) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					ip: Joi.string().ip({ version: ["ipv4", "ipv6"] }),
				}),
			},
		},
		path: "/peers/{ip}",
	});
};

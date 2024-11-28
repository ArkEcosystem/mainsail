import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { ContractsController } from "../controllers/contracts.js";
import { address } from "../schemas/schemas.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ContractsController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/contracts",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.abi(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					name: Joi.string().min(4).max(15),
					implementation: address,
				}),
			},
		},
		path: "/contracts/{name}/{implementation}/abi",
	});
};

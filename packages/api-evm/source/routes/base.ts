import Hapi from "@hapi/hapi";
import { Constants } from "@mainsail/contracts";
import Joi from "joi";

import { BaseController } from "../controllers/base";

export const BaseRoute = {
	register(server: Hapi.Server<any>): void {
		const controller = server.app.app.resolve(BaseController);
		server.bind(controller);

		server.route({
			handler: (request: Hapi.Request) => controller.index(request),
			method: "POST",
			options: {
				payload: {
					maxBytes: 100 * Constants.Units.KILOBYTE,
				},
				validate: {
					payload: Joi.object({
						// eslint-disable-next-line unicorn/no-null
						id: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.allow(null)).required(),
						jsonrpc: Joi.string().valid("2.0").required(),
						method: Joi.string().required(),
						params: Joi.any(),
					}),
				},
			},
			path: "/",
		});
	},
};

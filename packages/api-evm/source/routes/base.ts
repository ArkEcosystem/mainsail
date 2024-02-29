import Hapi from "@hapi/hapi";
import { Constants, Contracts } from "@mainsail/contracts";
import Joi from "joi";

export const BaseRoute = {
	register(server: Contracts.Api.ApiServer): void {
		server.route({
			handler: (request: Hapi.Request) => server.app.rpc.process(request),
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

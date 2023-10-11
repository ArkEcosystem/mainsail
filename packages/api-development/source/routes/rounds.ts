import Hapi from "@hapi/hapi";
import Joi from "joi";

import { RoundsController } from "../controllers/rounds";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(RoundsController);
	server.bind(controller);

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

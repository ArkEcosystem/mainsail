import Hapi from "@hapi/hapi";
import Joi from "joi";

import { StatisticController } from "../controllers/statistic.js";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(StatisticController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/statistic",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					id: Joi.string(),
				}),
			},
		},
		path: "/statistic/{id}",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.latest(request),
		method: "GET",
		path: "/statistic/latest",
	});
};

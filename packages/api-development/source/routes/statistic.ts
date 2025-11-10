import Hapi from "@hapi/hapi";

import { StatisticController } from "../controllers/statistic.js";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(StatisticController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/statistic",
	});
};

import Hapi from "@hapi/hapi";

import { RoundController } from "../controllers/round";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(RoundController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/round",
	});
};

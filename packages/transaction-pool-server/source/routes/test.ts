import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

import { TestController } from "../controllers/test.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(TestController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.store(request),
		method: "GET",
		path: "/test",
	});
};

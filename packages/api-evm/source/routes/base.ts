import Hapi from "@hapi/hapi";

import { BaseController } from "../controllers/base";

export const BaseRoute = {
	register(server: Hapi.Server<any>): void {
		const controller = server.app.app.resolve(BaseController);
		server.bind(controller);

		server.route({
			handler: (request: Hapi.Request) => controller.index(request),
			method: "POST",
			path: "/",
		});
	},
};

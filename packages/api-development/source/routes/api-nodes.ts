import Hapi from "@hapi/hapi";

import { ApiNodesController } from "../controllers/api-nodes.js";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(ApiNodesController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
		},
		path: "/api-nodes",
	});
};

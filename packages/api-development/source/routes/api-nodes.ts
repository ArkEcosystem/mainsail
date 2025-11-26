import type Hapi from "@hapi/hapi";
import type { Contracts } from "@mainsail/contracts";

import { ApiNodesController } from "../controllers/api-nodes.js";

export const register = (server: Contracts.Api.ApiServer): void => {
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

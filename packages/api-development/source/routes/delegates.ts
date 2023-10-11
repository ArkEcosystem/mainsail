import Hapi from "@hapi/hapi";

import { DelegatesController } from "../controllers/delegates";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(DelegatesController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: { enabled: true },
			},
			validate: {
				query: pagination,
			},
		},
		path: "/delegates",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		path: "/delegates/{id}",
	});
};

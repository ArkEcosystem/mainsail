import Hapi from "@hapi/hapi";

import { ValidatorsController } from "../controllers/validators";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(ValidatorsController);
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
		path: "/validators",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.show(request),
		method: "GET",
		path: "/validators/{id}",
	});
};

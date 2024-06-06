import Hapi from "@hapi/hapi";

import { TransactionsController } from "../controllers/transactions.js";

export const register = (server: Hapi.Server<any>): void => {
	const controller = server.app.app.resolve(TransactionsController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.types(request),
		method: "GET",
		path: "/transactions/types",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.schemas(request),
		method: "GET",
		path: "/transactions/schemas",
	});
};

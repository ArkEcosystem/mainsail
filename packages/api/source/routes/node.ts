import Hapi from "@hapi/hapi";

import { NodeController } from "../controllers/node";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(NodeController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.status(request),
		method: "GET",
		path: "/node/status",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.syncing(request),
		method: "GET",
		path: "/node/syncing",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.configurationNode(request),
		method: "GET",
		path: "/node/configuration",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.configurationCrypto(request),
		method: "GET",
		path: "/node/configuration/crypto",
	});
};

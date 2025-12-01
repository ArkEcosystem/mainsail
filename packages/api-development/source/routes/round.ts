import type Hapi from "@hapi/hapi";
import type { Contracts } from "@mainsail/contracts";

import { RoundController } from "../controllers/round.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(RoundController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/round",
	});
};

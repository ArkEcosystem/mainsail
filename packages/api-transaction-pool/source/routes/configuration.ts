import type { Contracts } from "@mainsail/contracts";

import { ConfigurationController } from "../controllers/configuration.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ConfigurationController);
	server.bind(controller);

	server.route({
		handler: () => controller.configuration(),
		method: "GET",
		path: "/configuration",
	});
};

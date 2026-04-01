import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { ConfigurationController } from "../controllers/configuration.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ConfigurationController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.configuration(request),
		method: "GET",
		path: "/configuration",
	});
};

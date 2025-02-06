import Hapi from "@hapi/hapi";
import { Schemas } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { LegacyController } from "../controllers/legacy.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(LegacyController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.coldWallets(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({}).concat(Schemas.pagination),
			},
		},
		path: "/legacy/cold-wallets",
	});
};

import type { Types } from "@mainsail/api-common";
import { Schemas } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { LegacyController } from "../controllers/legacy.js";
import { legacyAddressSchema } from "../schemas/legacy.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(LegacyController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.coldWallets(request),
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

	server.route({
		handler: (request: Types.HapiRequest) => controller.showColdWallet(request),
		method: "GET",
		options: {
			validate: {
				params: Joi.object({
					address: legacyAddressSchema,
				}),
				query: Joi.object({}),
			},
		},
		path: "/legacy/cold-wallets/{address}",
	});
};

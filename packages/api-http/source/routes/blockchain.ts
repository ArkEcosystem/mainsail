import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { BlockchainController } from "../controllers/blockchain.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(BlockchainController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.index(request),
		method: "GET",
		path: "/blockchain",
	});
};

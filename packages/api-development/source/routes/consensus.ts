import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { ConsensusController } from "../controllers/consensus.js";

export const register = (server: Contracts.Api.ApiServer): void => {
	const controller = server.app.app.resolve(ConsensusController);
	server.bind(controller);

	server.route({
		handler: (request: Types.HapiRequest) => controller.state(request),
		method: "GET",
		path: "/consensus/state",
	});
};

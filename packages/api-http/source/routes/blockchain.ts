import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/api-common";
import { BlockchainController } from "../controllers/blockchain";

export const register = (server: Contracts.ApiServer): void => {
	const controller = server.app.app.resolve(BlockchainController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		path: "/blockchain",
	});
};

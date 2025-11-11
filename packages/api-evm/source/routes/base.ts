import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";
import { Units } from "@mainsail/constants";

export const BaseRoute = {
	register(server: Contracts.Api.ApiServer): void {
		server.route({
			handler: (request: Hapi.Request) => server.app.rpc.process(request),
			method: "POST",
			options: {
				payload: {
					maxBytes: 100 * Units.KILOBYTE,
				},
			},
			path: "/",
		});
	},
};

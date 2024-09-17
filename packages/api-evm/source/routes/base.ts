import Hapi from "@hapi/hapi";
import { Constants, Contracts } from "@mainsail/contracts";

export const BaseRoute = {
	register(server: Contracts.Api.ApiServer): void {
		server.route({
			handler: (request: Hapi.Request) => server.app.rpc.process(request),
			method: "POST",
			options: {
				payload: {
					maxBytes: 100 * Constants.Units.KILOBYTE,
				},
			},
			path: "/",
		});
	},
};

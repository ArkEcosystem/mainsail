import Hapi from "@hapi/hapi";
import { Contracts, Identifiers } from "@mainsail/contracts";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		return (request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue => {
			const blockHeight = app
				.get<Contracts.State.Service>(Identifiers.StateService)
				.getStateStore()
				.getLastHeight();

			const responsePropertyToUpdate = "isBoom" in request.response ? request.response.output : request.response;
			responsePropertyToUpdate.headers["X-Block-Height"] = blockHeight;

			return h.continue;
		};
	},
	name: "response-headers",

	register(server: Hapi.Server<any>): void {
		server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
	},

	version: "1.0.0",
};

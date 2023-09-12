import Hapi from "@hapi/hapi";
import { Contracts } from "@mainsail/contracts";

export const responseHeaders = {
	getOnPreResponseHandler(app: Contracts.Kernel.Application) {
		return (request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue => {
			// TODO: read from database, API doesn't have access to the in-memory state

			// const blockHeight = app.get<Contracts.State.StateStore>(Identifiers.StateStore).getLastHeight();

			// const responsePropertyToUpdate = request.response.isBoom ? request.response.output : request.response;
			// responsePropertyToUpdate.headers = responsePropertyToUpdate.headers ?? {};
			// responsePropertyToUpdate.headers["X-Block-Height"] = blockHeight;

			return h.continue;
		};
	},
	name: "response-headers",

	register(server: Hapi.Server): void {
		server.ext("onPreResponse", this.getOnPreResponseHandler(server.app.app));
	},

	version: "1.0.0",
};

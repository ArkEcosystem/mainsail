import Hapi from "@hapi/hapi";
import { set } from "@mainsail/utils";

export const dotSeparatedQuery = {
	name: "dot-separated-query",
	onRequest(request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue {
		const query = {};
		for (const [key, value] of Object.entries(request.query)) {
			set(query, key, value);
		}
		set(request, "query", query);
		return h.continue;
	},

	register(server: Hapi.Server): void {
		server.ext("onRequest", this.onRequest);
	},

	version: "1.0.0",
};

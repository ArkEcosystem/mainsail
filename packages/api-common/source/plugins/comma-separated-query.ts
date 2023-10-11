import Hapi from "@hapi/hapi";
import { set } from "@mainsail/utils";

export const commaArrayQuery = {
	name: "comma-array-query",
	onRequest(request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue {
		const query = {};
		const separator = ",";

		for (const [key, value] of Object.entries(request.query as { [key: string]: string })) {
			query[key] = value.includes(separator) ? value.split(separator) : value;
		}

		set(request, "query", query);

		return h.continue;
	},

	register(server: Hapi.Server): void {
		server.ext("onRequest", this.onRequest);
	},

	version: "1.0.0",
};

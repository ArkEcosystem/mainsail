import type Hapi from "@hapi/hapi";

import { set } from "@mainsail/utils";

export const commaArrayQuery = {
	name: "comma-array-query",
	onRequest: (request: Hapi.Request, h: Hapi.ResponseToolkit): Hapi.Lifecycle.ReturnValue => {
		const query = {};
		const separator = ",";

		// Hapi yields a string for a single query parameter but an array when the same key is
		// repeated (e.g. ?id=1&id=2). Only strings can be comma-split; array entries are split
		// individually so repeated and comma-separated values produce consistent results.
		const split = (value: unknown) =>
			typeof value === "string" && value.includes(separator) ? value.split(separator) : value;

		for (const [key, value] of Object.entries(request.query)) {
			query[key] = Array.isArray(value) ? value.flatMap((entry) => split(entry)) : split(value);
		}

		set(request, "query", query);

		return h.continue;
	},

	register(server: Hapi.Server): void {
		server.ext("onRequest", commaArrayQuery.onRequest);
	},

	version: "1.0.0",
};

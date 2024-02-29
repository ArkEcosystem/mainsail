import Hapi from "@hapi/hapi";

import { BaseRoute } from "./routes/base";

export = {
	name: "EVM API Routes",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [BaseRoute];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "1.0.0",
};

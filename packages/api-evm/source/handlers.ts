import { Contracts } from "@mainsail/contracts";

import { BaseRoute } from "./routes/base.js";

const config = {
	name: "EVM API Routes",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [BaseRoute];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "1.0.0",
};

export default config;

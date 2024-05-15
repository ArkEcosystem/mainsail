import { Contracts } from "@mainsail/contracts";

import * as TestRoute from "./routes/test.js";

const config = {
	name: "Transaction Pool API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [TestRoute];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "1.0.0",
};

export default config;

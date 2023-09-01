import Hapi from "@hapi/hapi";

import * as Blocks from "./routes/blocks";
import * as Transactions from "./routes/transactions";

export = {
	name: "Public API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [Blocks, Transactions];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

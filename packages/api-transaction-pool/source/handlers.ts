import Hapi from "@hapi/hapi";

import * as TransactionPool from "./routes/transaction-pool";

export = {
	name: "Transaction Pool API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [TransactionPool];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

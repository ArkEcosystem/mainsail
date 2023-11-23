import { Contracts } from "@mainsail/contracts";

import * as TransactionPool from "./routes/transaction-pool";

export = {
	name: "Transaction Pool API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [TransactionPool];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

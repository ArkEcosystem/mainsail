import { Contracts } from "@mainsail/contracts";

import * as Configuration from "./routes/configuration.js";
import * as Transactions from "./routes/transactions.js";

const config = {
	name: "Transaction Pool API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [Transactions, Configuration];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

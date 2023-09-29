import Hapi from "@hapi/hapi";

import * as Blocks from "./routes/blocks";
import * as Node from "./routes/node";
import * as Transactions from "./routes/transactions";
import * as ValidatorRounds from "./routes/validator-rounds";
import * as Wallets from "./routes/wallets";

export = {
	name: "Public API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [Blocks, Transactions, Node, ValidatorRounds, Wallets];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

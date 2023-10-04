import Hapi from "@hapi/hapi";

import * as Blocks from "./routes/blocks";
import * as Blockchain from "./routes/blockchain";
import * as Node from "./routes/node";
import * as Transactions from "./routes/transactions";
import * as ValidatorRounds from "./routes/validator-rounds";
import * as Votes from "./routes/votes";
import * as Wallets from "./routes/wallets";

export = {
	name: "Public API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [Blocks, Blockchain, Transactions, Node, ValidatorRounds, Votes, Wallets];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

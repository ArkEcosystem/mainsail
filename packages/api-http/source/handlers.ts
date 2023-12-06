import { Contracts } from "@mainsail/contracts";

import * as ApiNodes from "./routes/api-nodes";
import * as Blockchain from "./routes/blockchain";
import * as Blocks from "./routes/blocks";
import * as Delegates from "./routes/delegates";
import * as Node from "./routes/node";
import * as Peers from "./routes/peers";
import * as Transactions from "./routes/transactions";
import * as ValidatorRounds from "./routes/validator-rounds";
import * as Votes from "./routes/votes";
import * as Wallets from "./routes/wallets";

export = {
	name: "Public API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [ApiNodes, Blocks, Blockchain, Delegates, Peers, Transactions, Node, ValidatorRounds, Votes, Wallets];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

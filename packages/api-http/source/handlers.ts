import { Contracts } from "@mainsail/contracts";

import * as ApiNodes from "./routes/api-nodes.js";
import * as Blockchain from "./routes/blockchain.js";
import * as Blocks from "./routes/blocks.js";
import * as Commits from "./routes/commits.js";
import * as Delegates from "./routes/delegates.js";
import * as Node from "./routes/node.js";
import * as Peers from "./routes/peers.js";
import * as Transactions from "./routes/transactions.js";
import * as ValidatorRounds from "./routes/validator-rounds.js";
import * as Votes from "./routes/votes.js";
import * as Wallets from "./routes/wallets.js";

const config = {
	name: "Public API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [
			ApiNodes,
			Blocks,
			Blockchain,
			Commits,
			Delegates,
			Peers,
			Transactions,
			Node,
			ValidatorRounds,
			Votes,
			Wallets,
		];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

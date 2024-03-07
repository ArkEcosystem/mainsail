import Hapi from "@hapi/hapi";

import * as ApiNodes from "./routes/api-nodes";
import * as Blockchain from "./routes/blockchain";
import * as Blocks from "./routes/blocks";
import * as Consensus from "./routes/consensus";
import * as Node from "./routes/node";
import * as Peers from "./routes/peers";
import * as Round from "./routes/round";
import * as Transactions from "./routes/transactions";
import * as Validators from "./routes/validators";
import * as Wallets from "./routes/wallets";

const config = {
	name: "Development API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [
			ApiNodes,
			Blockchain,
			Blocks,
			Consensus,
			Validators,
			Node,
			Peers,
			Round,
			Transactions,
			Wallets,
		];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

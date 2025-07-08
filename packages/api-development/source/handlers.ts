import Hapi from "@hapi/hapi";

import * as ApiNodes from "./routes/api-nodes.js";
import * as Blockchain from "./routes/blockchain.js";
import * as Blocks from "./routes/blocks.js";
import * as Consensus from "./routes/consensus.js";
import * as Node from "./routes/node.js";
import * as Peers from "./routes/peers.js";
import * as Round from "./routes/round.js";

const config = {
	name: "Development API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [ApiNodes, Blockchain, Blocks, Consensus, Node, Peers, Round];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

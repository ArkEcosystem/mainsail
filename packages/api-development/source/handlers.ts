import type Hapi from "@hapi/hapi";

import { register as apiNodeRegister } from "./routes/api-nodes.js";
import { register as blockchainRegister } from "./routes/blockchain.js";
import { register as blocksRegister } from "./routes/blocks.js";
import { register as consensusRegister } from "./routes/consensus.js";
import { register as nodeRegister } from "./routes/node.js";
import { register as peersRegister } from "./routes/peers.js";
import { register as roundRegister } from "./routes/round.js";
import { register as statisticRegister } from "./routes/statistic.js";

const config = {
	name: "Development API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [
			{ register: apiNodeRegister },
			{ register: blockchainRegister },
			{ register: blocksRegister },
			{ register: consensusRegister },
			{ register: nodeRegister },
			{ register: peersRegister },
			{ register: roundRegister },
			{ register: statisticRegister },
		];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

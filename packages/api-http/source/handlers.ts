import type { Contracts } from "@mainsail/contracts";

import { register as apiNodesRegister } from "./routes/api-nodes.js";
import { register as blockchainRegister } from "./routes/blockchain.js";
import { register as blocksRegister } from "./routes/blocks.js";
import { register as commitsRegister } from "./routes/commits.js";
import { register as contractsRegister } from "./routes/contracts.js";
import { register as legacyRegister } from "./routes/legacy.js";
import { register as nodeRegister } from "./routes/node.js";
import { register as peersRegister } from "./routes/peers.js";
import { register as receiptsRegister } from "./routes/receipts.js";
import { register as transactionsRegister } from "./routes/transactions.js";
import { register as tokensRegister } from "./routes/tokens.js";
import { register as validatorRoundsRegister } from "./routes/validator-rounds.js";
import { register as validatorsRegister } from "./routes/validators.js";
import { register as votesRegister } from "./routes/votes.js";
import { register as walletsRegister } from "./routes/wallets.js";

const config = {
	name: "Public API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [
			{ register: apiNodesRegister },
			{ register: blockchainRegister },
			{ register: blocksRegister },
			{ register: commitsRegister },
			{ register: contractsRegister },
			{ register: validatorsRegister },
			{ register: peersRegister },
			{ register: receiptsRegister },
			{ register: transactionsRegister },
			{ register: tokensRegister },
			{ register: nodeRegister },
			{ register: validatorRoundsRegister },
			{ register: votesRegister },
			{ register: walletsRegister },
			{ register: legacyRegister },
		];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

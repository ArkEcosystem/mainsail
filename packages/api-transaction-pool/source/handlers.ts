import { Contracts } from "@mainsail/contracts";

import { register as configurationRegister } from "./routes/configuration.js";
import { register as transactionsRegister } from "./routes/transactions.js";

const config = {
	name: "Transaction Pool API",
	async register(server: Contracts.Api.ApiServer): Promise<void> {
		const handlers = [
			{
				register: configurationRegister,
			},
			{
				register: transactionsRegister,
			},
		];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "2.0.0",
};

export default config;

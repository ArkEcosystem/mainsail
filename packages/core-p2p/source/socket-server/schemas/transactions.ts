import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { headers } from "./shared";

export const transactionsSchemas = {
	createPostTransactionsSchema: (app: Contracts.Kernel.Application): Joi.AnySchema =>
		Joi.object({
			headers,
			transactions: Joi.array()
				.items(Joi.binary())
				.max(
					app
						.getTagged<Providers.PluginConfiguration>(
							Identifiers.PluginConfiguration,
							"plugin",
							"core-transaction-pool",
						)
						.getOptional<number>("maxTransactionsPerRequest", 40),
				),
		}),
};

import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const createPostTransactionsSchema = (app: Contracts.Kernel.Application): Joi.AnySchema =>
	Joi.object({
		headers: makeHeaders(app.get(Identifiers.Cryptography.Configuration)),
		transactions: Joi.array()
			.items(Joi.binary())
			.max(
				app
					.getTagged<Providers.PluginConfiguration>(
						Identifiers.ServiceProvider.Configuration,
						"plugin",
						"transaction-pool",
					)
					.getRequired<number>("maxTransactionsPerRequest"),
			),
	});

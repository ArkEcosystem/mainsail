import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { makeHeaders } from "./shared";
import Joi from "joi";

export const createPostTransactionsSchema = (app: Contracts.Kernel.Application): Joi.AnySchema =>
	Joi.object({
		headers: makeHeaders(app.get(Identifiers.Cryptography.Configuration)),
		transactions: Joi.array()
			.items(Joi.binary())
			.max(
				app
					.getTagged<Providers.PluginConfiguration>(
						Identifiers.PluginConfiguration,
						"plugin",
						"transaction-pool",
					)
					.getOptional<number>("maxTransactionsPerRequest", 40),
			),
	});

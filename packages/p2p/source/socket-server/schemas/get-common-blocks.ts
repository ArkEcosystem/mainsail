import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const getCommonBlocks = (configuration: Contracts.Crypto.IConfiguration) =>
	Joi.object({
		headers: makeHeaders(configuration),
		// TODO strings are block ids
		ids: Joi.array().min(1).max(10).items(Joi.string()),
	});

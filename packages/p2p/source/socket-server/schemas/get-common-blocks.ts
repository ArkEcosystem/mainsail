import { Contracts } from "@mainsail/contracts";
import { makeHeaders } from "./shared";
import Joi from "joi";

export const getCommonBlocks = (configuration: Contracts.Crypto.IConfiguration) => {
	return Joi.object({
		headers: makeHeaders(configuration),
		// TODO strings are block ids
		ids: Joi.array().min(1).max(10).items(Joi.string()),
	});
}

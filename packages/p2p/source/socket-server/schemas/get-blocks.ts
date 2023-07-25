import { Contracts } from "@mainsail/contracts";
import { makeHeaders } from "./shared";
import Joi from "joi";

export const getBlocks = (configuration: Contracts.Crypto.IConfiguration) => {
	return Joi.object({
		headers: makeHeaders(configuration),
		fromHeight: Joi.number().integer().min(1).required(),
		limit: Joi.number().integer().min(1).max(400).required(),
	}).required();
}

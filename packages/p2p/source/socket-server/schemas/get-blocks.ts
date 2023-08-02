import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const getBlocks = (configuration: Contracts.Crypto.IConfiguration) =>
	Joi.object({
		fromHeight: Joi.number().integer().min(0).required(),
		headers: makeHeaders(configuration),
		limit: Joi.number().integer().min(1).max(400).required(),
	}).required();

import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { constants } from "../../constants.js";
import { makeHeaders } from "./shared.js";

export const getBlocks = (configuration: Contracts.Crypto.Configuration) =>
	Joi.object({
		fromHeight: Joi.number().integer().min(0).required(),
		headers: makeHeaders(configuration),
		limit: Joi.number().integer().min(1).max(constants.MAX_DOWNLOAD_BLOCKS).required(),
	}).required();

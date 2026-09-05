import type { Contracts } from "@mainsail/contracts";

import Joi from "joi";

import { makeHeaders } from "./shared.js";

export const getProposal = (configuration: Contracts.Crypto.Configuration): Joi.ObjectSchema =>
	Joi.object({
		headers: makeHeaders(configuration),
		query: Joi.object({
			blockNumber: Joi.number().integer().min(1).required(),
			round: Joi.number().integer().min(0).required(),
		}).required(),
	});

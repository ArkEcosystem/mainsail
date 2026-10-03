import type { Contracts } from "@mainsail/contracts";

import Joi from "joi";

import { makeHeaders } from "./shared.js";

export const getMessages = (configuration: Contracts.Crypto.Configuration): Joi.ObjectSchema => {
	const roundValidators = configuration.getMaxRoundValidators();

	return Joi.object({
		headers: makeHeaders(configuration),
		query: Joi.object({
			blockNumber: Joi.number().integer().min(1).required(),
			round: Joi.number().integer().min(0).required(),
			validatorsSignedPrecommit: Joi.array().items(Joi.boolean()).max(roundValidators).required(),
			validatorsSignedPrevote: Joi.array().items(Joi.boolean()).max(roundValidators).required(),
		}).required(),
	});
};

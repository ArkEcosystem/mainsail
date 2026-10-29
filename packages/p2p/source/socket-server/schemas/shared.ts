import type { Contracts } from "@mainsail/contracts";

import Joi from "joi";

export const makeHeaders = (configuration: Contracts.Crypto.Configuration): Joi.ObjectSchema => {
	const roundValidators = configuration.getMaxRoundValidators();

	return Joi.object({
		blockNumber: Joi.number().integer().min(1).required(),
		proposedBlockHash: Joi.string()
			.pattern(/^[0-9a-f]{64}$/)
			// eslint-disable-next-line unicorn/no-null
			.allow(null)
			.required(),
		round: Joi.number().integer().min(0).required(),
		step: Joi.number().integer().min(0).max(2).required(),
		validatorsSignedPrecommit: Joi.array().items(Joi.boolean()).max(roundValidators).required(),
		validatorsSignedPrevote: Joi.array().items(Joi.boolean()).max(roundValidators).required(),
		version: Joi.string()
			.max(24)
			.pattern(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+\.\d+)?$/)
			.required(),
	}).required();
};

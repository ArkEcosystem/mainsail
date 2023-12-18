import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const postPrecommit = (configuration: Contracts.Crypto.Configuration) =>
	Joi.object({
		headers: makeHeaders(configuration),
		precommit: Joi.binary(),
	});

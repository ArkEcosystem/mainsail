import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared.js";

export const getApiNodes = (configuration: Contracts.Crypto.Configuration): Joi.ObjectSchema =>
	Joi.object({
		headers: makeHeaders(configuration),
	});

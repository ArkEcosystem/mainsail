import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const postPrevote = (configuration: Contracts.Crypto.IConfiguration) =>
	Joi.object({
		headers: makeHeaders(configuration),
		prevote: Joi.binary(),
	});

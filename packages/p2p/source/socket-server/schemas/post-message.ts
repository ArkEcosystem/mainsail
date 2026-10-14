import type { Contracts } from "@mainsail/contracts";

import Joi from "joi";

import { constants } from "../../constants.js";
import { makeHeaders } from "./shared.js";

export const postMessage = (configuration: Contracts.Crypto.Configuration): Joi.ObjectSchema =>
	Joi.object({
		headers: makeHeaders(configuration),
		message: Joi.binary().max(constants.MAX_PAYLOAD_POST_MESSAGE),
	});

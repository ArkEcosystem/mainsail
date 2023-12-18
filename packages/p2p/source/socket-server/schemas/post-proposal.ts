import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const postProposal = (configuration: Contracts.Crypto.Configuration) =>
	Joi.object({
		headers: makeHeaders(configuration),
		proposal: Joi.binary(),
	});

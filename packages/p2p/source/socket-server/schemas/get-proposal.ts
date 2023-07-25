import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { makeHeaders } from "./shared";

export const getProposal = (configuration: Contracts.Crypto.IConfiguration) =>
	Joi.object({
		headers: makeHeaders(configuration),
	});

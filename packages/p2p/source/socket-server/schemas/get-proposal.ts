import { Contracts } from "@mainsail/contracts";
import { makeHeaders } from "./shared";
import Joi from "joi";

export const getProposal = (configuration: Contracts.Crypto.IConfiguration) => {
	return Joi.object({
		headers: makeHeaders(configuration),
	});
}

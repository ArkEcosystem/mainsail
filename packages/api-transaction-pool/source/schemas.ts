import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

export const pagination = Joi.object({
	limit: Schemas.paginationLimit,
	page: Joi.number().integer().positive().default(1),
});

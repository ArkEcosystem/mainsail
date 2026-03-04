import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

export const tokenNameSchema = Joi.string().max(32);
export const tokenBalanceSchema = Joi.number().positive().allow(0);

export const tokenWhitelistPayloadSchema = Joi.object({
	whitelist: Joi.array().items(Schemas.addressSchema).max(100).empty(null).default([]),
}).empty(null);

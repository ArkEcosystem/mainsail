import Joi from "joi";

export const tokenNameSchema = Joi.string().max(32);
export const tokenBalanceSchema = Joi.number().positive().allow(0);
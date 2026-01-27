import Joi from "joi";

export const tokenNameSchema = Joi.string().max(32);
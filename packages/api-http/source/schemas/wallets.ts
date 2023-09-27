import Joi from "joi";
import { createCriteriaSchema, createRangeCriteriaSchema, createSortingSchema } from "./schemas";

export const walletAddressSchema = Joi.string().alphanum(); /* TODO: .length(34); */
export const walletPublicKeySchema = Joi.string().hex(); /* TODO: .length(66); */
export const walletUsernameSchema = Joi.string().max(256);

export const walletId = Joi.alternatives().try(
    Joi.string()
        .regex(/^[\d!$&.@_a-z]+$/)
        .min(1)
        .max(20),
    walletAddressSchema,
    walletPublicKeySchema,
);

export const walletCriteriaSchemaObject = {
    address: Joi.alternatives(
        walletAddressSchema,
        Joi.string()
            .regex(/^[0-9A-Za-z%]{1,34}$/)
            .regex(/%/),
    ),
    publicKey: Joi.alternatives(
        walletPublicKeySchema,
        Joi.string()
            .regex(/^[0-9a-z%]{1,66}$/)
            .regex(/%/),
    ),
    balance: createRangeCriteriaSchema(Joi.number().integer().positive()),
    nonce: createRangeCriteriaSchema(Joi.number().integer().positive()),
    attributes: Joi.object(),
};

export const walletParamSchema = Joi.alternatives(walletAddressSchema, walletPublicKeySchema, walletUsernameSchema);
export const walletCriteriaSchema = createCriteriaSchema(walletCriteriaSchemaObject);
export const walletSortingSchema = createSortingSchema(walletCriteriaSchemaObject, ["attributes"]);

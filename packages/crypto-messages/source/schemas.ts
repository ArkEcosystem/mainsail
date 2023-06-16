import { AnySchemaObject } from "ajv";
import { Contracts } from "@mainsail/contracts";

export const schemas: Record<"proposal" | "prevote" | "precommit", AnySchemaObject> = {
    proposal: {
        $id: "proposal",
        properties: {
            height: { minimum: 1, type: "integer" },
            round: { minimum: 1, type: "integer" },
            validRound: { minimum: 1, type: "integer" },
            block: {
                type: "object",
                properties: {
                    serialized: { type: "string" }
                },
                required: ["serialized"],
            },
            validatorIndex: { minimum: 0, maximum: 50, /* TODO: milestone */ type: "integer" },
            signature: { $ref: "alphanumeric" },
        },
        required: ["height", "round", "block", "validatorIndex"],
        type: "object",
    },
    prevote: {
        $id: "prevote",
        properties: {
            type: { enum: [Contracts.Crypto.MessageType.Prevote] },
            height: { minimum: 1, type: "integer" },
            round: { minimum: 1, type: "integer" },
            blockId: { $ref: "blockId" },
            validatorIndex: { minimum: 0, maximum: 50, /* TODO: milestone */ type: "integer" },
            signature: { $ref: "alphanumeric" },
        },
        required: ["type", "height", "round", "validatorIndex", "signature"],
        type: "object",
    },
    precommit: {
        $id: "precommit",
        properties: {
            type: { enum: [Contracts.Crypto.MessageType.Precommit] },
            height: { minimum: 1, type: "integer" },
            round: { minimum: 1, type: "integer" },
            blockId: { $ref: "blockId" },
            validatorIndex: { minimum: 0, maximum: 50, /* TODO: milestone */ type: "integer" },
            signature: { $ref: "alphanumeric" },
        },
        required: ["type", "height", "round", "validatorIndex", "signature"],
        type: "object",
    },
};

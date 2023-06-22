import { AnySchemaObject } from "ajv";
import { Contracts } from "@mainsail/contracts";

export const schemas: Record<"proposal" | "prevote" | "precommit" | "proposalLockProof" | "validatorBitmap", AnySchemaObject> = {
    proposal: {
        $id: "proposal",
        properties: {
            height: { minimum: 1, type: "integer" },
            round: { minimum: 1, type: "integer" },
            block: {
                type: "object",
                properties: {
                    serialized: { $ref: "alphanumeric" }
                },
                required: ["serialized"],
            },
            validatorIndex: { minimum: 0, maximum: 50, /* TODO: milestone */ type: "integer" },
            validRound: { minimum: 1, type: "integer" },
            signature: { $ref: "consensusSignature" },
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
            signature: { $ref: "consensusSignature" },
        },
        required: ["type", "height", "round", "validatorIndex"],
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
            signature: { $ref: "consensusSignature" },
        },
        required: ["type", "height", "round", "validatorIndex"],
        type: "object",
    },
    proposalLockProof: {
        $id: "lockProof",
        properties: {
            signature: { $ref: "consensusSignature" },
            validators: {
                $ref: "validatorBitmap"
            },
        },
        required: ["signature", "validators"],
        type: "object",
    },
    validatorBitmap: {
        $id: "validatorBitmap",
        items: { type: "boolean" },
        minItems: 0,
        maxItems: 51, // TODO: milestone
        type: "array",
    }
};

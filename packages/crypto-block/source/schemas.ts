import { AnySchemaObject } from "ajv";

export const schemas: Record<"block" | "blockId" | "blockHeader", AnySchemaObject> = {
	block: {
		$id: "block",
		$ref: "blockHeader",
		properties: {
			transactions: {
				$ref: "transactions",
				maxItems: { $data: "1/numberOfTransactions" },
				minItems: { $data: "1/numberOfTransactions" },
				type: "array",
			},
		},
		type: "object",
	},
	blockHeader: {
		$id: "blockHeader",
		properties: {
			blockSignature: { $ref: "hex" },
			generatorPublicKey: { $ref: "publicKey" },
			height: { minimum: 1, type: "integer" },
			id: { $ref: "blockId" },
			numberOfTransactions: { minimum: 0, type: "integer" },
			payloadHash: { $ref: "hex" },
			payloadLength: { minimum: 0, type: "integer" },
			previousBlock: { $ref: "blockId" },
			reward: { bignumber: { minimum: 0 } },
			timestamp: { minimum: 0, type: "integer" },
			totalAmount: { bignumber: { minimum: 0 } },
			totalFee: { bignumber: { minimum: 0 } },
			version: { enum: [1] },
		},
		required: [
			"id",
			"timestamp",
			"previousBlock",
			"height",
			"totalAmount",
			"totalFee",
			"reward",
			"generatorPublicKey",
			"blockSignature",
		],
		type: "object",
	},
	blockId: {
		$id: "blockId",
		allOf: [
			{
				$ref: "hex",
				maxLength: 64,
				minLength: 64,
			},
		],
		type: "string",
	},
};

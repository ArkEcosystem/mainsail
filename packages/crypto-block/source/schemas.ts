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
			generatorAddress: { $ref: "address" },
			height: { minimum: 0, type: "integer" },
			id: { $ref: "blockId" },
			numberOfTransactions: { minimum: 0, type: "integer" },
			payloadHash: { $ref: "hex" },
			payloadLength: { minimum: 0, type: "integer" },
			previousBlock: { $ref: "blockId" },
			reward: { bignumber: { minimum: 0 } },
			stateHash: { $ref: "hex" },
			timestamp: { maximum: 2 ** 48 - 1, minimum: 0, type: "integer" },
			totalAmount: { bignumber: { minimum: 0 } },
			totalFee: { bignumber: { minimum: 0 } },
			totalGasUsed: { minimum: 0, type: "integer" },
			version: { enum: [1] },
		},
		required: [
			"id",
			"timestamp",
			"previousBlock",
			"height",
			"stateHash",
			"totalGasUsed",
			"totalAmount",
			"totalFee",
			"reward",
			"generatorAddress",
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

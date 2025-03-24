import { AnySchemaObject } from "ajv";

export const schemas: Record<"block" | "blockId" | "prefixedBlockId" | "blockHeader" | "logsBloom", AnySchemaObject> = {
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
			hash: { $ref: "blockId" },
			logsBloom: { $ref: "logsBloom" },
			number: { minimum: 0, type: "integer" },
			gasUsed: { minimum: 0, type: "integer" },
			numberOfTransactions: { minimum: 0, type: "integer" },
			parentHash: { $ref: "blockId" },
			payloadHash: { $ref: "hex" },
			payloadLength: { minimum: 0, type: "integer" },
			proposer: { $ref: "address" },
			reward: { bignumber: { minimum: 0 } },
			stateHash: { $ref: "hex" },
			timestamp: { maximum: 2 ** 48 - 1, minimum: 0, type: "integer" },
			totalAmount: { bignumber: { minimum: 0 } },
			totalFee: { bignumber: { minimum: 0 } },
			version: { enum: [1] },
		},
		required: [
			"hash",
			"timestamp",
			"parentHash",
			"number",
			"stateHash",
			"logsBloom",
			"totalGasUsed",
			"totalAmount",
			"totalFee",
			"reward",
			"proposer",
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
	logsBloom: {
		$id: "logsBloom",
		allOf: [
			{
				$ref: "hex",
				maxLength: 512,
				minLength: 512,
			},
		],
		type: "string",
	},
	prefixedBlockId: {
		$id: "prefixedBlockId",
		allOf: [
			{
				$ref: "prefixedHex",
				maxLength: 66,
				minLength: 66,
			},
		],
		type: "string",
	},
};

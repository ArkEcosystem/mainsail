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
			amount: { bignumber: { minimum: 0 } },
			gasUsed: { minimum: 0, type: "integer" },
			hash: { $ref: "blockId" },
			logsBloom: { $ref: "logsBloom" },
			number: { minimum: 0, type: "integer" },
			parentHash: { $ref: "blockId" },
			payloadLength: { minimum: 0, type: "integer" },
			proposer: { $ref: "address" },
			reward: { bignumber: { minimum: 0 } },
			stateRoot: { $ref: "hex" },
			timestamp: { maximum: 2 ** 48 - 1, minimum: 0, type: "integer" },
			totalFee: { bignumber: { minimum: 0 } },
			transactionsCount: { minimum: 0, type: "integer" },
			transactionsRoot: { $ref: "hex" },
			version: { enum: [1] },
		},
		required: [
			"hash",
			"timestamp",
			"parentHash",
			"transactionsRoot",
			"transactionsCount",
			"number",
			"stateRoot",
			"logsBloom",
			"gasUsed",
			"amount",
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

import { AnySchemaObject } from "ajv";

export const schemas: Record<"block" | "blockId" | "prefixedBlockId" | "blockHeader" | "logsBloom", AnySchemaObject> = {
	block: {
		$id: "block",
		$ref: "blockHeader",
		properties: {
			transactions: {
				$ref: "transactions",
				maxItems: { $data: "1/transactionsCount" },
				minItems: { $data: "1/transactionsCount" },
				type: "array",
			},
		},
		type: "object",
	},
	blockHeader: {
		$id: "blockHeader",
		properties: {
			amount: { bignumber: { minimum: 0 } },
			fee: { bignumber: { minimum: 0 } },
			gasUsed: { minimum: 0, type: "integer" },
			hash: { $ref: "blockId" },
			logsBloom: { $ref: "logsBloom" },
			number: { minimum: 0, type: "integer" },
			parentHash: { $ref: "blockId" },
			payloadSize: { minimum: 0, type: "integer" },
			proposer: { $ref: "address" },
			reward: { bignumber: { minimum: 0 } },
			stateRoot: { $ref: "hex" },
			timestamp: { maximum: 2 ** 48 - 1, minimum: 0, type: "integer" },
			transactionsCount: { minimum: 0, type: "integer" },
			transactionsRoot: { $ref: "hex" },
			version: { enum: [1] },
		},
		required: [
			"amount",
			"fee",
			"gasUsed",
			"hash",
			"logsBloom",
			"number",
			"parentHash",
			"payloadSize",
			"proposer",
			"reward",
			"stateRoot",
			"timestamp",
			"transactionsCount",
			"transactionsRoot",
			"version",
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

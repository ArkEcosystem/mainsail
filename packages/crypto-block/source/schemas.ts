import { AnySchemaObject } from "ajv";

export const schemas: Record<
	"block" | "blockHash" | "prefixedBlockHash" | "blockHeader" | "logsBloom",
	AnySchemaObject
> = {
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
	blockHash: {
		$id: "blockHash",
		allOf: [
			{
				$ref: "hex",
				maxLength: 64,
				minLength: 64,
			},
		],
		type: "string",
	},
	blockHeader: {
		$id: "blockHeader",
		properties: {
			amount: { bignumber: { minimum: 0 } },
			fee: { bignumber: { minimum: 0 } },
			gasUsed: { minimum: 0, type: "integer" },
			hash: { $ref: "blockHash" },
			logsBloom: { $ref: "logsBloom" },
			number: { minimum: 0, type: "integer" },
			parentHash: { $ref: "blockHash" },
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
	prefixedBlockHash: {
		$id: "prefixedBlockHash",
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

import type { AnySchemaObject } from "ajv";

export const schemas: Record<
	"block" | "blockHash" | "prefixedBlockHash" | "blockHeader" | "logsBloom" | "stateRoot" | "transactionsRoot",
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
			/* eslint-disable perfectionist/sort-objects */
			hash: { $ref: "blockHash" },
			version: { enum: [1] },
			timestamp: { maximum: 2 ** 48 - 1, minimum: 0, type: "integer" },
			number: { minimum: 0, type: "integer" },
			round: { minimum: 0, type: "integer" },
			parentHash: { $ref: "blockHash" },
			stateRoot: { $ref: "stateRoot" },
			logsBloom: { $ref: "logsBloom" },
			transactionsCount: { minimum: 0, type: "integer" },
			gasUsed: { minimum: 0, type: "integer" },
			fee: { bigInt: { minimum: 0 } },
			reward: { bigInt: { minimum: 0 } },
			payloadSize: { minimum: 0, type: "integer" },
			transactionsRoot: { $ref: "transactionsRoot" },
			proposer: { $ref: "address" },
			/* eslint-enable perfectionist/sort-objects */
		},
		required: [
			"hash",
			"version",
			"timestamp",
			"number",
			"round",
			"parentHash",
			"stateRoot",
			"logsBloom",
			"transactionsCount",
			"gasUsed",
			"fee",
			"reward",
			"payloadSize",
			"transactionsRoot",
			"proposer",
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
				$ref: "prefixedQuantityHex",
				maxLength: 66,
				minLength: 66,
			},
		],
		type: "string",
	},
	stateRoot: {
		$id: "stateRoot",
		allOf: [
			{
				$ref: "hex",
				maxLength: 64,
				minLength: 64,
			},
		],
		type: "string",
	},
	transactionsRoot: {
		$id: "transactionsRoot",
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

import { SchemaObject } from "ajv";

const id: SchemaObject = {
	anyOf: [{ type: "string" }, { type: "integer" }, { type: "null" }],
};

const jsonrpc: SchemaObject = {
	const: "2.0",
	type: "string",
};

const jsonRpcError: SchemaObject = {
	additionalProperties: false,
	properties: {
		error: {
			additionalProperties: false,
			properties: {
				code: { type: "integer" },
				data: {},
				message: { type: "string" },
			},
			required: ["code", "message"],
			type: "object",
		},
		id: id,
		jsonrpc: jsonrpc,
	},
	required: ["jsonrpc", "error", "id"],
	type: "object",
};

const jsonRpcResult: SchemaObject = {
	additionalProperties: false,
	properties: {
		id,
		jsonrpc,
		result: {},
	},
	required: ["jsonrpc", "result", "id"],
	type: "object",
};

export const jsonRpcResponseSchema: SchemaObject = {
	$id: "jsonRpcResponse",
	oneOf: [jsonRpcError, jsonRpcResult],
};

export const jsonRpcPayloadSchema: SchemaObject = {
	$id: "jsonRpcPayload",

	additionalProperties: false,

	properties: {
		id,
		jsonrpc,
		method: { type: "string" },
		params: {},
	},
	required: ["id", "jsonrpc", "method"],
	type: "object",
};

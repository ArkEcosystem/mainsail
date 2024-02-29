import { SchemaObject } from "ajv";

export const jsonRpcPayloadSchema: SchemaObject = {
	$id: "jsonRpcPayload",

	additionalProperties: false,

	properties: {
		id: { anyOf: [{ type: "string" }, { type: "integer" }, { type: "null" }] },
		jsonrpc: { const: "2.0" },
		method: { type: "string" },
		params: {},
	},
	required: ["id", "jsonrpc", "method"],
	type: "object",
};

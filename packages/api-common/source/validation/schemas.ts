import { SchemaObject } from "ajv";

export const jsonRpcPayloadSchema: SchemaObject = {
	$id: "jsonRpcPayload",

	properties: {
		id: { anyOf: [{ type: "string" }, { type: "integer" }, { type: "null" }] },
		jsonRpc: { const: "2.0" },
		method: { type: "string" },
		params: { type: "any" },
	},

	required: ["id", "jsonRpc", "method"],
	type: "object",
};

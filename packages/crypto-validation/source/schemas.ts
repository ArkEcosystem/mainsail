import { SchemaObject } from "ajv";

export const schemas: Record<"alphanumeric" | "hex" | "prefixedQuantityHex" | "prefixedDataHex", SchemaObject> = {
	alphanumeric: {
		$id: "alphanumeric",
		pattern: "^[a-z0-9]+$",
		type: "string",
	},
	prefixedDataHex: {
		$id: "prefixedDataHex",
		pattern: "^0x[0-9a-f]*$",
		type: "string",
	},
	hex: {
		$id: "hex",
		pattern: "^[0123456789a-f]+$",
		type: "string",
	},
	prefixedQuantityHex: {
		$id: "prefixedQuantityHex",
		pattern: "^0x[0-9a-f]+$",
		type: "string",
	},
};

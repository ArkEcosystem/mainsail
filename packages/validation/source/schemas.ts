import type { SchemaObject } from "ajv";

export const schemas: Record<"alphanumeric" | "hex" | "prefixedQuantityHex" | "prefixedDataHex", SchemaObject> = {
	alphanumeric: {
		$id: "alphanumeric",
		pattern: "^[a-z0-9]+$",
		type: "string",
	},
	hex: {
		$id: "hex",
		pattern: "^[0123456789a-f]+$",
		type: "string",
	},
	prefixedDataHex: {
		$id: "prefixedDataHex",
		pattern: "^0x([0-9a-f]{2})*$",
		type: "string",
	},
	// requires at least one hex character after the "0x" prefix
	prefixedQuantityHex: {
		$id: "prefixedQuantityHex",
		pattern: "^0x[0-9a-f]+$",
		type: "string",
	},
};

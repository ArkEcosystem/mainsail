import { SchemaObject } from "ajv";

export const schemas: Record<"alphanumeric" | "hex" | "prefixedHex", SchemaObject> = {
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
	prefixedHex: {
		$id: "0xHex",
		pattern: "^0x[0-9a-f]+$",
		type: "string",
	},
};

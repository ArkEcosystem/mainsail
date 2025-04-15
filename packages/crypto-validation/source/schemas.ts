import { SchemaObject } from "ajv";

export const schemas: Record<"alphanumeric" | "hex" | "quantityHex" | "dataHex", SchemaObject> = {
	alphanumeric: {
		$id: "alphanumeric",
		pattern: "^[a-z0-9]+$",
		type: "string",
	},
	dataHex: {
		$id: "dataHex",
		pattern: "^0x[0-9a-f]*$",
		type: "string",
	},
	hex: {
		$id: "hex",
		pattern: "^[0123456789a-f]+$",
		type: "string",
	},
	quantityHex: {
		$id: "quantityHex",
		pattern: "^0x[0-9a-f]+$",
		type: "string",
	},
};

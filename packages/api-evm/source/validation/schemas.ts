import { AnySchemaObject } from "ajv";

export const schemas: Record<"blockTag", AnySchemaObject> = {
	blockTag: {
		$id: "blockTag",
		anyOf: [
			{
				enum: ["latest", "finalized", "safe"],
				type: "string",
			},
			{
				$ref: "prefixedHex",
				// currentHeightHex: true, // TODO: Implement historical data and enable later
			},
		],
	},
};

import { AnySchemaObject } from "ajv";

export const schemas: Record<"blockTag", AnySchemaObject> = {
	blockTag: {
		$id: "blockTag",
		anyOf: [
			{
				enum: ["latest", "safe", "finalized"],
				type: "string",
			},
			{
				$ref: "prefixedQuantityHex",
				// currentHeightHex: true, // TODO: Implement historical data and enable later
			},
		],
	},
};

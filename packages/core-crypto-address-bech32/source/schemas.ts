import { Contracts } from "@mainsail/core-contracts";

export const makeSchemas = (configuration: Contracts.Crypto.IConfiguration) => {
	const address = {
		$id: "address",
		allOf: [
			{
				$ref: "alphanumeric",
				maxLength: 63,
				minLength: 62,
				pattern: configuration.getMilestone().address.bech32,
			},
		],
		type: "string",
	};

	return { address };
};

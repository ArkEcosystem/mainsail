import { Contracts } from "@mainsail/contracts";

export const makeSchemas = (configuration: Contracts.Crypto.Configuration) => {
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

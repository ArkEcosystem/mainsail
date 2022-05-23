import { Contracts } from "@arkecosystem/core-contracts";
import { FormatDefinition } from "ajv";

export const makeFormats = (configuration: Contracts.Crypto.IConfiguration) => {
	const vendorField: FormatDefinition<string> = {
		type: "string",
		validate: (data) => {
			try {
				return Buffer.from(data, "utf8").length <= configuration.getMilestone().vendorFieldLength;
			} catch {
				return false;
			}
		},
	};

	return { vendorField };
};

import { Contracts } from "@mainsail/contracts";
import { FormatDefinition } from "ajv";

export const makeFormats = (configuration: Contracts.Crypto.IConfiguration) => {
	const vendorField: FormatDefinition<string> = {
		type: "string",
		validate: (data) => {
			try {
				return Buffer.byteLength(data, "utf8") <= configuration.getMilestone().vendorFieldLength;
			} catch {
				return false;
			}
		},
	};

	return { vendorField };
};

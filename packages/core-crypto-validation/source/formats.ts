import { Contracts } from "@arkecosystem/core-contracts";
import { Ajv } from "ajv";

import { isValidPeer } from "./is-valid-peer";

export const registerFormats = (configuration: Contracts.Crypto.IConfiguration) => {
	const vendorField = (ajv: Ajv) => {
		ajv.addFormat("vendorField", (data) => {
			try {
				return Buffer.from(data, "utf8").length <= configuration.getMilestone().vendorFieldLength;
			} catch {
				return false;
			}
		});
	};

	const validPeer = (ajv: Ajv) => {
		ajv.addFormat("peer", (ip: string) => {
			try {
				return isValidPeer({ ip }, false);
			} catch {
				return false;
			}
		});
	};

	return { validPeer, vendorField };
};

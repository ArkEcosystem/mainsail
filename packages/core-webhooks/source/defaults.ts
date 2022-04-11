import { Constants } from "@arkecosystem/core-contracts";

export const defaults = {
	enabled: !!process.env[Constants.Flags.CORE_WEBHOOKS_ENABLED],
	server: {
		http: {
			host: process.env[Constants.Flags.CORE_WEBHOOKS_HOST] || "0.0.0.0",
			port: process.env[Constants.Flags.CORE_WEBHOOKS_PORT] || 4004,
		},
		whitelist: ["127.0.0.1", "::ffff:127.0.0.1"],
	},
	timeout: process.env[Constants.Flags.CORE_WEBHOOKS_TIMEOUT] || 1500,
};

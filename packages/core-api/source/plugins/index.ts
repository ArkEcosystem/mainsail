import { hapiAjv } from "./hapi-ajv";
import { responseHeaders } from "./response-headers";
import { whitelist } from "./whitelist";

export const preparePlugins = (config) => [
	{
		options: {
			trustProxy: config.trustProxy,
			whitelist: config.whitelist,
		},
		plugin: whitelist,
	},
	{ plugin: hapiAjv },
	{
		options: {
			...config.rateLimit,
			trustProxy: config.trustProxy,
		},
		plugin: require("./rate-limit"),
	},
	{
		options: {
			query: {
				limit: {
					default: config.pagination.limit,
				},
			},
		},
		plugin: require("./pagination"),
	},
	{ plugin: responseHeaders },
];

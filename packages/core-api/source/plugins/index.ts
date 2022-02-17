import { commaArrayQuery } from "./comma-array-query";
import { dotSeparatedQuery } from "./dot-separated-query";
import { hapiAjv } from "./hapi-ajv";
import { log } from "./log";
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
			...config.log,
			trustProxy: config.trustProxy,
		},
		plugin: log,
	},
	{ plugin: commaArrayQuery },
	{ plugin: dotSeparatedQuery },
	{
		options: config.cache,
		plugin: require("./cache"),
	},
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

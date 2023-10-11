import { commaArrayQuery } from "./comma-separated-query";
import { dotSeparatedQuery } from "./dot-separated-query";
import { hapiAjv } from "./hapi-ajv";
import { pagination } from "./pagination";
import { rateLimit } from "./rate-limit";
import { responseHeaders } from "./response-headers";
import { whitelist } from "./whitelist";

export const preparePlugins: any = (config) => [
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
		plugin: rateLimit,
	},
	{ plugin: commaArrayQuery },
	{ plugin: dotSeparatedQuery },
	{
		options: {
			query: {
				limit: {
					default: config.pagination.limit,
				},
			},
		},
		plugin: pagination,
	},
	{ plugin: responseHeaders },
];

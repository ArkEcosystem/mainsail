import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import mm from "micromatch";

import { getIp } from "../utils/index.js";

type Options = {
	limit: number;
	limitPerIp?: number;
	limitPerIpWhitelist?: string[];
	trustProxy?: boolean;
};

const slot = "concurrency-limit";

const isLimited = (request: Hapi.Request): boolean =>
	request.route.settings.plugins?.["concurrencyLimit"]?.enabled === true;

export const concurrencyLimit = {
	name: "concurrency-limit",
	once: true,
	async register(server: Hapi.Server, options: Options): Promise<void> {
		if (options.limit === 0) {
			return;
		}

		const { limitPerIp = 0, limitPerIpWhitelist = [], trustProxy = false } = options;
		const { payload, statusCode } = Boom.serverUnavailable("Too many concurrent requests").output;

		let active = 0;
		const perIp = new Map<string, number>();

		const count = (ip: string, change: number): void => {
			const total = (perIp.get(ip) ?? 0) + change;

			if (total === 0) {
				perIp.delete(ip);
			} else {
				perIp.set(ip, total);
			}
		};

		const isOverLimitPerIp = (ip: string): boolean =>
			limitPerIp > 0 && (perIp.get(ip) ?? 0) >= limitPerIp && !mm.isMatch(ip, limitPerIpWhitelist);

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!isLimited(request)) {
					return h.continue;
				}

				const ip = getIp(request, trustProxy);

				if (active >= options.limit || isOverLimitPerIp(ip)) {
					return h.response(payload).code(statusCode).takeover();
				}

				active++;
				count(ip, 1);
				request.plugins[slot] = ip;

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			const ip = request.plugins[slot] as string | undefined;

			if (ip !== undefined) {
				active--;
				count(ip, -1);
			}
		});
	},
	version: "1.0.0",
};

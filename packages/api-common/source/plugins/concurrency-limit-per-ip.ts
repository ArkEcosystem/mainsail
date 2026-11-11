import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import mm from "micromatch";

import { getIp } from "../utils/index.js";
import { isLimited } from "./concurrency-limit.js";

type Options = {
	limit: number;
	trustProxy?: boolean;
	whitelist?: string[];
};

const slot = "concurrency-limit-per-ip";

export const concurrencyLimitPerIp = {
	name: "concurrency-limit-per-ip",
	once: true,
	async register(server: Hapi.Server, options: Options): Promise<void> {
		if (options.limit === 0) {
			return;
		}

		const { trustProxy = false, whitelist = [] } = options;
		const { payload, statusCode } = Boom.serverUnavailable("Too many concurrent requests").output;
		const active = new Map<string, number>();

		const count = (ip: string, change: number): void => {
			const total = (active.get(ip) ?? 0) + change;

			if (total === 0) {
				active.delete(ip);
			} else {
				active.set(ip, total);
			}
		};

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!isLimited(request)) {
					return h.continue;
				}

				const ip = getIp(request, trustProxy);

				if (mm.isMatch(ip, whitelist)) {
					return h.continue;
				}

				if ((active.get(ip) ?? 0) >= options.limit) {
					return h.response(payload).code(statusCode).takeover();
				}

				count(ip, 1);
				request.plugins[slot] = ip;

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			const ip = request.plugins[slot] as string | undefined;

			if (ip !== undefined) {
				count(ip, -1);
			}
		});
	},
	version: "1.0.0",
};

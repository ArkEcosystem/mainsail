import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import { IpAddress } from "@mainsail/utils";
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

		const { trustProxy = false } = options;
		const whitelist = IpAddress.canonicalPatterns(options.whitelist ?? []);
		const { payload, statusCode } = Boom.tooManyRequests("Too many concurrent requests").output;
		const active = new Map<string, number>();

		const count = (key: string, change: number): void => {
			const total = (active.get(key) ?? 0) + change;

			if (total === 0) {
				active.delete(key);
			} else {
				active.set(key, total);
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

				const key = IpAddress.subnetAddress(ip);

				if ((active.get(key) ?? 0) >= options.limit) {
					return h.response(payload).code(statusCode).takeover();
				}

				count(key, 1);
				request.plugins[slot] = key;

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			const key = request.plugins[slot] as string | undefined;

			if (key !== undefined) {
				count(key, -1);
			}
		});
	},
	version: "1.0.0",
};

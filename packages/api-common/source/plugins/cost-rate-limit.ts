import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import { IpAddress } from "@mainsail/utils";
import mm from "micromatch";

import { getIp } from "../utils/index.js";

type Options = {
	duration: number;
	enabled: boolean;
	headerPrefix: string;
	message?: string;
	points: number;
	trustProxy: boolean;
	whitelist: string[];
};

type RoutePoints = (request: Hapi.Request) => number;

type Bucket = {
	expires: number;
	used: number;
};

type Budget = {
	remaining: number;
	reset: number;
};

const slot = "cost-rate-limit";

export const costRateLimit = {
	name: "cost-rate-limit",
	once: true,
	async register(server: Hapi.Server, options: Options): Promise<void> {
		if (!options.enabled) {
			return;
		}

		const duration = options.duration * 1000;
		const whitelist = IpAddress.canonicalPatterns(options.whitelist);
		const { payload, statusCode } = Boom.tooManyRequests(options.message).output;
		const buckets = new Map<string, Bucket>();

		const bucketOf = (key: string): Bucket => {
			let bucket = buckets.get(key);

			if (bucket === undefined) {
				bucket = { expires: performance.now() + duration, used: 0 };

				buckets.set(key, bucket);
				setTimeout(() => buckets.delete(key), duration).unref();
			}

			return bucket;
		};

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				const routePoints: RoutePoints | undefined = request.route.settings.plugins?.["costRateLimit"]?.points;

				if (routePoints === undefined) {
					return h.continue;
				}

				const ip = getIp(request, options.trustProxy);

				if (mm.isMatch(ip, whitelist)) {
					return h.continue;
				}

				const points = routePoints(request);
				const bucket = bucketOf(IpAddress.subnetAddress(ip));
				const left = bucket.expires - performance.now();
				const refused = bucket.used + points > options.points;

				if (!refused) {
					bucket.used += points;
				}

				const budget: Budget = {
					remaining: options.points - bucket.used,
					reset: Date.now() + Math.max(0, left),
				};

				request.plugins[slot] = budget;

				if (refused) {
					const seconds = Math.max(1, Math.ceil(left / 1000));

					return h.response(payload).code(statusCode).header("Retry-After", String(seconds)).takeover();
				}

				return h.continue;
			},
			type: "onPreHandler",
		});

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				const budget = request.plugins[slot] as Budget | undefined;

				if (budget === undefined) {
					return h.continue;
				}

				const headers = {
					[`${options.headerPrefix}-Limit`]: String(options.points),
					[`${options.headerPrefix}-Remaining`]: String(budget.remaining),
					[`${options.headerPrefix}-Reset`]: new Date(budget.reset).toUTCString(),
				};

				for (const [name, value] of Object.entries(headers)) {
					if ("isBoom" in request.response) {
						request.response.output.headers[name] = value;
					} else {
						request.response.header(name, value);
					}
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};

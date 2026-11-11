import type Hapi from "@hapi/hapi";
import type { RateLimiterRes } from "rate-limiter-flexible";

import Boom from "@hapi/boom";
import mm from "micromatch";
import { RateLimiterMemory, RLWrapperBlackAndWhite } from "rate-limiter-flexible";

import { getIp } from "../utils/index.js";

type RoutePoints = (request: Hapi.Request, ip: string) => number;

type RateLimitPluginData = {
	remaining: number;
	reset: number;
};

const isRateLimiterResponse = (value: unknown): value is RateLimiterRes =>
	typeof value === "object" && value !== null && "remainingPoints" in value && "msBeforeNext" in value;

const isListed = (ip: string, patterns: string[]): boolean => {
	for (const pattern of patterns) {
		if (mm.isMatch(ip, pattern)) {
			return true;
		}
	}

	return false;
};

export const rateLimit = {
	name: "rate-limit",
	once: true,
	async register(
		server: Hapi.Server,
		options: {
			enabled: boolean;
			points: number;
			duration: number;
			whitelist: string[];
			blacklist: string[];
			trustProxy: boolean;
		},
	): Promise<void> {
		if (options.enabled === false) {
			return;
		}

		const rateLimiter = new RLWrapperBlackAndWhite({
			blackList: options.blacklist || [],
			isBlackListed: (ip: string) => isListed(ip, options.blacklist || []),
			isWhiteListed: (ip: string) => isListed(ip, options.whitelist || ["*"]),
			limiter: new RateLimiterMemory({ duration: options.duration, points: options.points }),
			runActionAnyway: false,
			whiteList: options.whitelist || ["*"],
		});

		const consume = async (request: Hapi.Request, ip: string, points: number): Promise<Boom.Boom | undefined> => {
			try {
				const rateLimitRes: RateLimiterRes = await rateLimiter.consume(ip, points);

				request.plugins["rate-limit"] = {
					remaining: rateLimitRes.remainingPoints,
					reset: Date.now() + rateLimitRes.msBeforeNext,
				} as RateLimitPluginData;
			} catch (error) {
				// rate-limiter-flexible rejects with a RateLimiterRes (not an Error) when
				// the limit is hit; a real Error only occurs on an internal failure.
				if (error instanceof Error) {
					return Boom.internal(error.message);
				}

				if (isRateLimiterResponse(error)) {
					request.plugins["rate-limit"] = {
						remaining: error.remainingPoints,
						reset: Date.now() + error.msBeforeNext,
					};
				}

				return Boom.tooManyRequests();
			}

			return undefined;
		};

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) =>
				(await consume(request, getIp(request, options.trustProxy), 1)) ?? h.continue,
			type: "onRequest",
		});

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				const routePoints: RoutePoints | undefined = request.route.settings.plugins?.["rateLimit"]?.points;

				if (routePoints === undefined) {
					return h.continue;
				}

				const ip = getIp(request, options.trustProxy);
				const points = routePoints(request, ip) - 1;

				if (points <= 0) {
					return h.continue;
				}

				const left = await rateLimiter.get(ip);

				if (left && points > left.remainingPoints) {
					request.plugins["rate-limit"] = {
						remaining: left.remainingPoints,
						reset: Date.now() + left.msBeforeNext,
					} as RateLimitPluginData;

					return Boom.tooManyRequests();
				}

				return (await consume(request, ip, points)) ?? h.continue;
			},
			type: "onPreHandler",
		});

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (request.plugins["rate-limit"]) {
					const data = request.plugins["rate-limit"] as RateLimitPluginData;

					if ("isBoom" in request.response) {
						request.response.output.headers["X-RateLimit-Limit"] = String(options.points);
						request.response.output.headers["X-RateLimit-Remaining"] = String(data.remaining);
						request.response.output.headers["X-RateLimit-Reset"] = new Date(data.reset).toUTCString();
						request.response.output.headers["Retry-After"] = Math.max(0, (data.reset - Date.now()) / 1000);
					} else {
						request.response.header("X-RateLimit-Limit", String(options.points));
						request.response.header("X-RateLimit-Remaining", String(data.remaining));
						request.response.header("X-RateLimit-Reset", new Date(data.reset).toUTCString());
					}
				}

				return h.continue;
			},
			type: "onPreResponse",
		});
	},
	version: "1.0.0",
};

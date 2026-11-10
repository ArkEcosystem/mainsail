import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";
import mm from "micromatch";

import { getIp } from "../utils/index.js";

type Options = {
	limit: number;
	limitPerIp?: number;
	limitPerIpWhitelist?: string[];
	queueLimit?: number;
	queueTimeout?: number;
	trustProxy?: boolean;
};

type Waiter = {
	deadline: number;
	ip: string;
	request: Hapi.Request;
	resolve: (acquired: boolean) => void;
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

		const {
			limitPerIp = 0,
			limitPerIpWhitelist = [],
			queueLimit = 0,
			queueTimeout = 0,
			trustProxy = false,
		} = options;
		const { payload, statusCode } = Boom.serverUnavailable("Too many concurrent requests").output;

		let active = 0;
		let timer: NodeJS.Timeout | undefined;
		const queue: Waiter[] = [];
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

		const expire = (): void => {
			timer = undefined;

			const now = performance.now();
			const pending = queue.findIndex((waiter) => waiter.deadline > now);

			for (const waiter of queue.splice(0, pending === -1 ? queue.length : pending)) {
				count(waiter.ip, -1);
				waiter.resolve(false);
			}

			schedule(now);
		};

		const schedule = (now: number): void => {
			if (timer === undefined && queue.length > 0) {
				timer = setTimeout(expire, queue[0].deadline - now);
			}
		};

		const acquire = async (request: Hapi.Request, ip: string): Promise<boolean> => {
			if (isOverLimitPerIp(ip)) {
				return false;
			}

			if (active < options.limit) {
				active++;
				count(ip, 1);
				request.plugins[slot] = ip;

				return true;
			}

			if (queue.length >= queueLimit) {
				return false;
			}

			count(ip, 1);

			return new Promise<boolean>((resolve) => {
				const now = performance.now();
				queue.push({ deadline: now + queueTimeout, ip, request, resolve });
				schedule(now);
			});
		};

		const release = (ip: string): void => {
			count(ip, -1);

			for (let waiter = queue.shift(); waiter; waiter = queue.shift()) {
				if (waiter.request.active()) {
					waiter.request.plugins[slot] = waiter.ip;
					waiter.resolve(true);

					return;
				}

				count(waiter.ip, -1);
				waiter.resolve(false);
			}

			active--;
		};

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (!isLimited(request)) {
					return h.continue;
				}

				if (!(await acquire(request, getIp(request, trustProxy)))) {
					return h.response(payload).code(statusCode).takeover();
				}

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			const ip = request.plugins[slot] as string | undefined;

			if (ip !== undefined) {
				release(ip);
			}
		});
	},
	version: "1.0.0",
};

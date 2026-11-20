import type Hapi from "@hapi/hapi";

import Boom from "@hapi/boom";

type Options = {
	concurrent: number;
	queued: number;
};

type Waiter = (admitted: boolean) => void;

const slot = "request-queue";

export const requestQueue = {
	name: "request-queue",
	once: true,
	async register(server: Hapi.Server, options: Options): Promise<void> {
		if (options.concurrent === 0) {
			return;
		}

		const { payload, statusCode } = Boom.tooManyRequests("Too many concurrent requests").output;
		const waiting = new Set<Waiter>();
		let active = 0;

		server.ext({
			method: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
				if (request.route.settings.plugins?.["requestQueue"]?.enabled !== true) {
					return h.continue;
				}

				if (active < options.concurrent) {
					active++;
					request.plugins[slot] = true;
				} else if (waiting.size < options.queued) {
					await new Promise<void>((resolve) => {
						const waiter: Waiter = (admitted) => {
							request.plugins[slot] = admitted || undefined;
							resolve();
						};

						waiting.add(waiter);
						request.plugins[slot] = waiter;
					});
				} else {
					return h.response(payload).code(statusCode).takeover();
				}

				return h.continue;
			},
			type: "onPreAuth",
		});

		server.events.on("response", (request: Hapi.Request) => {
			const state = request.plugins[slot] as Waiter | true | undefined;

			if (state === true) {
				const [next] = waiting;

				if (next) {
					waiting.delete(next);
					next(true);
				} else {
					active--;
				}
			} else if (state !== undefined) {
				waiting.delete(state);
				state(false);
			}
		});
	},
	version: "1.0.0",
};

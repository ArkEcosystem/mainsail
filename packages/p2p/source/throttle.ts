import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

import { RateLimiter } from "./rate-limiter.js";
import { buildRateLimiter } from "./utils/index.js";

@injectable()
export class Throttle {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Queue.Factory)
	private readonly createQueue!: Contracts.Kernel.QueueFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#queue!: Contracts.Kernel.Queue;

	#outgoingRateLimiter!: RateLimiter;

	public async initialize(): Promise<Throttle> {
		this.#outgoingRateLimiter = buildRateLimiter({
			rateLimit: this.configuration.getRequired<number>("rateLimit"),

			remoteAccess: [],

			roundValidators: this.cryptoConfiguration.getMaxRoundValidators(),
			// White listing anybody here means we would not throttle ourselves when sending
			// them requests, ie we could spam them.
			whitelist: [],
		});

		this.#queue = await this.createQueue();
		await this.#queue.start();

		return this;
	}

	public async throttle(peer: Contracts.P2P.Peer, event: string): Promise<void> {
		return new Promise<void>((resolve) => {
			void this.#queue.push({
				handle: async () => {
					await this.#process(peer, event, resolve);
				},
			});
		});
	}

	async #process(peer: Contracts.P2P.Peer, event: string, resolve: () => void): Promise<void> {
		const retryAfter = await this.#outgoingRateLimiter.msBeforeNext(peer.ip, event);

		if (retryAfter > 0) {
			this.logger.debug(
				`Throttling outgoing requests to ${peer.ip}/${event} to avoid triggering their rate limit`,
				"p2p",
			);

			// Wait outside the queue so a throttled peer or endpoint never
			// delays sends to anybody else; requeue once the budget has
			// actually refilled instead of checking again on a fixed interval.
			setTimeout(() => {
				// Mirror the queue's own stop() semantics: pending work is dropped on shutdown.
				if (!this.#queue.isStarted()) {
					return;
				}

				void this.#queue.push({
					handle: async () => {
						await this.#process(peer, event, resolve);
					},
				});
			}, retryAfter);

			return;
		}

		await this.#outgoingRateLimiter.consume(peer.ip, event);

		resolve();
	}
}

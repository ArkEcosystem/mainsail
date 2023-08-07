import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Types } from "@mainsail/kernel";
import delay from "delay";

import { RateLimiter } from "./rate-limiter";
import { buildRateLimiter } from "./utils";

@injectable()
export class Throttle {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.QueueFactory)
	private readonly createQueue!: Types.QueueFactory;

	#queue!: Contracts.Kernel.Queue;

	#outgoingRateLimiter!: RateLimiter;

	public async initialize(): Promise<Throttle> {
		this.#outgoingRateLimiter = buildRateLimiter({
			activeValidators: this.cryptoConfiguration.getMilestone().activeValidators,

			rateLimit: this.configuration.getRequired<number>("rateLimit"),

			rateLimitPostTransactions: this.configuration.getRequired<number>("rateLimitPostTransactions"),

			remoteAccess: [],
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
					await this.#doJob(peer, event, resolve);
				},
			});
		});
	}

	async #doJob(peer: Contracts.P2P.Peer, event: string, resolve: () => void): Promise<void> {
		if (await this.#outgoingRateLimiter.hasExceededRateLimitNoConsume(peer.ip, event)) {
			await delay(100);

			void this.#queue.push({
				handle: async () => {
					await this.#doJob(peer, event, resolve);
				},
			});
		} else {
			await this.#outgoingRateLimiter.consume(peer.ip, event);

			resolve();
		}
	}
}

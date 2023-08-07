import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
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

	// #isProcessing = false;

	#outgoingRateLimiter!: RateLimiter;

	public async initialize(): Promise<void> {
		this.#queue = await this.createQueue();

		this.#outgoingRateLimiter = buildRateLimiter({
			activeValidators: this.cryptoConfiguration.getMilestone().activeValidators,

			rateLimit: this.configuration.getRequired<number>("rateLimit"),

			rateLimitPostTransactions: this.configuration.getRequired<number>("rateLimitPostTransactions"),

			remoteAccess: [],
			// White listing anybody here means we would not throttle ourselves when sending
			// them requests, ie we could spam them.
			whitelist: [],
		});
	}

	public async throttle(peer: Contracts.P2P.Peer, event: string): Promise<void> {
		return new Promise<void>((resolve) => {
			void this.#queue.push({
				handle: async () => {
					await this.#doJob(peer, event, resolve);
				},
			});
		});

		// this.#queue().push(async () => {});

		// return new Promise((resolve) => {
		// 	this.#jobs.push({
		// 		event,
		// 		peer,
		// 		resolve,
		// 	});

		// 	void this.#processJobs();
		// });
	}

	async #doJob(peer: Contracts.P2P.Peer, event: string, resolve: () => void): Promise<void> {
		if (await this.#outgoingRateLimiter.hasExceededRateLimitNoConsume(peer.ip, event)) {
			await delay(1000);

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

	// async #processJobs(): Promise<void> {
	// 	if (this.#isProcessing) {
	// 		return;
	// 	}

	// 	const job = this.#jobs.shift();

	// 	if (!job) {
	// 		return;
	// 	}

	// 	this.#isProcessing = true;

	// 	const { event, peer, resolve } = job;

	// 	if (await this.#outgoingRateLimiter.hasExceededRateLimitNoConsume(peer.ip, event)) {
	// 		this.#jobs.push(job);
	// 	} else {
	// 		await this.#outgoingRateLimiter.consume(peer.ip, event);
	// 		resolve();
	// 	}

	// 	this.#isProcessing = false;

	// 	void this.#processJobs();
	// }
}

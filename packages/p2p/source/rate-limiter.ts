import { assert } from "@mainsail/utils";
import { RateLimiterMemory, RLWrapperBlackAndWhite } from "rate-limiter-flexible";

export interface RateLimiterConfiguration {
	rateLimit: number;
	duration?: number;
	blockDuration?: number;
}

export interface EndpointRateLimiterConfiguration extends RateLimiterConfiguration {
	endpoint: string;
}

export interface RateLimiterConfigurations {
	global: RateLimiterConfiguration;
	endpoints: EndpointRateLimiterConfiguration[];
}

// @TODO review the implementation
export class RateLimiter {
	#global: RLWrapperBlackAndWhite;
	#endpoints: Map<string, RLWrapperBlackAndWhite>;

	public constructor({
		configurations,
		whitelist,
	}: {
		whitelist: string[];
		configurations: RateLimiterConfigurations;
	}) {
		configurations.endpoints = configurations.endpoints || [];

		this.#global = this.#buildRateLimiter(configurations.global, whitelist);
		this.#endpoints = new Map();

		for (const configuration of configurations.endpoints) {
			this.#endpoints.set(configuration.endpoint, this.#buildRateLimiter(configuration, whitelist));
		}
	}

	public async consume(ip: string, endpoint?: string): Promise<void> {
		await this.#global.consume(ip);

		if (endpoint && this.#endpoints.has(endpoint)) {
			const rateLimiter: RLWrapperBlackAndWhite | undefined = this.#endpoints.get(endpoint);

			assert.defined(rateLimiter);

			await rateLimiter.consume(ip);
		}
	}

	public async hasExceededRateLimit(ip: string, endpoint?: string): Promise<boolean> {
		try {
			await this.consume(ip, endpoint);
		} catch {
			return true;
		}

		return false;
	}

	// How long to wait before the next request to `ip`/`endpoint` fits the
	// budget again; 0 when a request may be made right away.
	public async msBeforeNext(ip: string, endpoint?: string): Promise<number> {
		let wait = 0;

		const global = await this.#global.get(ip);
		if (global !== null && global.remainingPoints <= 0) {
			wait = Math.max(wait, global.msBeforeNext);
		}

		if (endpoint && this.#endpoints.has(endpoint)) {
			const endpointLimiters: RLWrapperBlackAndWhite | undefined = this.#endpoints.get(endpoint);

			assert.defined(endpointLimiters);

			const endpointLimiter = await endpointLimiters.get(ip);
			if (endpointLimiter !== null && endpointLimiter.remainingPoints <= 0) {
				wait = Math.max(wait, endpointLimiter.msBeforeNext);
			}
		}

		return wait;
	}

	public getRateLimitedEndpoints(): string[] {
		return [...this.#endpoints.keys()];
	}

	public async isBlocked(ip: string): Promise<boolean> {
		const res = await this.#global.get(ip);
		return res !== null && res.remainingPoints <= 0;
	}

	#buildRateLimiter(configuration: RateLimiterConfiguration, whitelist: string[]): RLWrapperBlackAndWhite {
		return new RLWrapperBlackAndWhite({
			limiter: new RateLimiterMemory({
				blockDuration: configuration.blockDuration,
				duration: configuration.duration || 1,
				points: configuration.rateLimit,
			}),
			whiteList: whitelist,
		});
	}
}

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { RateLimiter } from "../../rate-limiter.js";
import { buildRateLimiter } from "../../utils/build-rate-limiter.js";

@injectable()
export class RateLimitPlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@multiInject(Identifiers.P2P.Routes)
	private readonly routes!: Contracts.P2P.Route[];

	private rateLimiter!: RateLimiter;

	public register(server) {
		this.rateLimiter = buildRateLimiter({
			rateLimit: this.configuration.getRequired<number>("rateLimit"),
			remoteAccess: this.configuration.getOptional<Array<string>>("remoteAccess", []),
			roundValidators: this.cryptoConfiguration.getRoundValidators(),
			whitelist: [],
		});

		const allRoutesConfigByPath = this.routes.reduce(
			(accumulator, route) => ({ ...accumulator, ...route.getRoutesConfigByPath() }),
			{},
		);

		server.ext({
			method: async (request, h) => {
				const endpoint = allRoutesConfigByPath[request.path].id;

				if (await this.rateLimiter.hasExceededRateLimit(request.info.remoteAddress, endpoint)) {
					return Boom.tooManyRequests("Rate limit exceeded");
				}
				return h.continue;
			},
			type: "onPreAuth",
		});
	}
}

import Boom from "@hapi/boom";
import { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { RateLimiter } from "../../rate-limiter";
import { buildRateLimiter } from "../../utils/build-rate-limiter";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetPeersRoute,
	GetStausRoute,
	PostBlockRoute,
	PostTransactionsRoute,
} from "../routes";

@injectable()
export class RateLimitPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	private rateLimiter!: RateLimiter;

	public register(server) {
		this.rateLimiter = buildRateLimiter({
			rateLimit: this.configuration.getOptional<number>("rateLimit", 100),
			rateLimitPostTransactions: this.configuration.getOptional<number>("rateLimitPostTransactions", 25),
			remoteAccess: this.configuration.getOptional<Array<string>>("remoteAccess", []),
			whitelist: [],
		});

		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStausRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostBlockRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
		};

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

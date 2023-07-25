import Boom from "@hapi/boom";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { RateLimiter } from "../../rate-limiter";
import { buildRateLimiter } from "../../utils/build-rate-limiter";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetMessagesRoute,
	GetPeersRoute,
	GetProposalRoute,
	GetStatusRoute,
	PostPrecommitRoute,
	PostPrevoteRoute,
	PostProposalRoute,
	PostTransactionsRoute,
} from "../routes";

@injectable()
export class RateLimitPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	private rateLimiter!: RateLimiter;

	public register(server) {
		this.rateLimiter = buildRateLimiter({
			rateLimit: this.configuration.getOptional<number>("rateLimit", 100),
			rateLimitPostTransactions: this.configuration.getOptional<number>("rateLimitPostTransactions", 25),
			remoteAccess: this.configuration.getOptional<Array<string>>("remoteAccess", []),
			activeValidators: this.cryptoConfiguration.getMilestone().activeValidators,
			whitelist: [],
		});

		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetMessagesRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetProposalRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStatusRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrecommitRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostPrevoteRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostProposalRoute).getRoutesConfigByPath(),
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

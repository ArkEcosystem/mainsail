import { Routes } from "../enums";
import { RateLimiter } from "../rate-limiter";

export const buildRateLimiter = (options) =>
	new RateLimiter({
		configurations: {
			endpoints: [
				{
					duration: 4,
					endpoint: Routes.PostBlock,
					rateLimit: 2,
				},
				{
					duration: 2,
					endpoint: Routes.GetBlocks,
					rateLimit: 1,
				},
				{
					endpoint: Routes.GetPeers,
					rateLimit: 1,
				},
				{
					endpoint: Routes.GetStatus,
					rateLimit: 2,
				},
				{
					endpoint: Routes.GetCommonBlocks,
					rateLimit: 9,
				},
				{
					endpoint: Routes.PostTransactions,
					rateLimit: options.rateLimitPostTransactions || 25,
				},
				{
					endpoint: Routes.PostProposal,
					rateLimit: 1,
				},
				{
					endpoint: Routes.PostPrevote,
					rateLimit: 51, // TODO: From milestones
				},
				{
					endpoint: Routes.PostPrecommit,
					rateLimit: 51, // TODO: From milestones
				},
			],
			global: {
				rateLimit: options.rateLimit,
			},
		},
		whitelist: [...options.whitelist, ...options.remoteAccess],
	});

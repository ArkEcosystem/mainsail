import { Routes } from "../enums";
import { RateLimiter } from "../rate-limiter";

export const buildRateLimiter = (options) =>
	new RateLimiter({
		configurations: {
			endpoints: [
				{
					endpoint: Routes.GetBlocks,
					rateLimit: 5,
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
					rateLimit: options.rateLimitPostTransactions,
				},
				{
					endpoint: Routes.PostProposal,
					rateLimit: 1,
				},
				{
					endpoint: Routes.PostPrevote,
					rateLimit: options.activeValidators,
				},
				{
					endpoint: Routes.PostPrecommit,
					rateLimit: options.activeValidators,
				},
				{
					endpoint: Routes.GetMessages,
					rateLimit: 5,
				},
				{
					endpoint: Routes.GetProposal,
					rateLimit: 5,
				},
			],
			global: {
				rateLimit: options.rateLimit,
			},
		},
		whitelist: [...options.whitelist, ...options.remoteAccess],
	});

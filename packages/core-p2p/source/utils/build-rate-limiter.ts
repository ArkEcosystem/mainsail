import { RateLimiter } from "../rate-limiter";

export const buildRateLimiter = (options) =>
	new RateLimiter({
		configurations: {
			endpoints: [
				{
					duration: 4,
					endpoint: "p2p.blocks.postBlock",
					rateLimit: 2,
				},
				{
					duration: 2,
					endpoint: "p2p.blocks.getBlocks",
					rateLimit: 1,
				},
				{
					endpoint: "p2p.peer.getPeers",
					rateLimit: 1,
				},
				{
					endpoint: "p2p.peer.getStatus",
					rateLimit: 2,
				},
				{
					endpoint: "p2p.peer.getCommonBlocks",
					rateLimit: 9,
				},
				{
					endpoint: "p2p.transactions.postTransactions",
					rateLimit: options.rateLimitPostTransactions || 25,
				},
			],
			global: {
				rateLimit: options.rateLimit,
			},
		},
		whitelist: [...options.whitelist, ...options.remoteAccess],
	});

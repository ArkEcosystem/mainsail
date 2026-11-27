export const constants = {
	CHECK_HEADER_DELAY: 2000,

	// What a peer charges against its get-blocks budget per block, on top of the block's transaction
	// payload. Mirrors PER_COMMIT_OVERHEAD_BYTES of get_commits_by_block_range in packages/evm/core/src/db.rs;
	// the block downloader uses it to tell a full response from a withheld one.
	COMMIT_BUDGET_OVERHEAD: 1024,

	// Known peers (seeds and active ones that lost their connection) are redialed from the service loop:
	// not again within this time, and forgotten after MAX_DIAL_ATTEMPTS dials that did not make them
	// active.
	DIAL_SPACING: 10_000,

	// A peer whose header we last received this many block times ago is asked for its status, this many
	// peers per turn of the service loop. On a live network no header gets that old: every exchange with
	// a peer carries one, and there are several per block.
	HEADER_REFRESH_BATCH: 5,
	HEADER_STALE_AFTER_BLOCKS: 2,

	// What one answer to getApiNodes may hold. The directory itself lives in @mainsail/p2p-api-nodes;
	// these are the limits of the route, which every node serves.
	MAX_API_NODE_URL_LENGTH: 2048,
	MAX_API_NODES_GET_API_NODES: 100,

	// New addresses, learned from other peers, are dialed this many at a time; further ones wait, and
	// are dropped once this many wait. A peer's list of dead addresses thus keeps the dialers busy for a
	// bounded time and never holds up the caller.
	MAX_CONCURRENT_DIALS: 8,

	MAX_DIAL_ATTEMPTS: 5,

	MAX_DOWNLOAD_BLOCKS: 400, // maximum number of blocks we can download at once
	MAX_DOWNLOAD_BLOCKS_JOBS: 10, // maximum number of blocks jobs

	MAX_PEERS_GET_PEERS: 500,

	MAX_QUEUED_DIALS: 100,

	// Per-block framing cost of one protobuf `repeated bytes` entry: 1 tag byte + up to a 4-byte length
	// varint. The get-blocks route adds this per block when budgeting the response against the route's
	// response limit.
	PROTO_BLOCK_OVERHEAD: 5,
	// Reserve for the fixed per-response framing (frame header + protobuf `headers` field). Inherited from
	// @mainsail/p2p, where it also covered the nes envelope; generous for the new frame.
	RESPONSE_ENVELOPE_RESERVE: 512,
};

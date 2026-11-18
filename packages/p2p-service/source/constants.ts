export const constants = {
	CHECK_HEADER_DELAY: 2000,

	// Known peers (seeds and active ones that lost their connection) are redialed from the service loop:
	// not again within this time, and forgotten after MAX_DIAL_ATTEMPTS dials that did not make them
	// active.
	DIAL_SPACING: 10_000,
	// cut-loose timeout for a fast peer cleanse. slow verifications continue in the background
	FAST_VERIFY_TIMEOUT: 1500,

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

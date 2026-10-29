import { Units } from "@mainsail/constants";

export const constants = {
	MAX_DOWNLOAD_BLOCKS: 400, // maximum number of blocks we can download at once

	MAX_PAYLOAD_CLIENT: 5 * Units.MEGABYTE, // max size of a complete serialized response frame the WS client accepts

	// Per-block framing cost of one protobuf `repeated bytes` entry: 1 tag byte + up to a 4-byte length
	// varint. The get-blocks route adds this per block when budgeting the response against MAX_PAYLOAD_CLIENT.
	PROTO_BLOCK_OVERHEAD: 5,
	// Reserve for the fixed per-response framing (frame header + protobuf `headers` field). Inherited from
	// @mainsail/p2p, where it also covered the nes envelope; generous for the new frame.
	RESPONSE_ENVELOPE_RESERVE: 512,
};

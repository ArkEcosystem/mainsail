import { Units } from "@mainsail/constants";

export const constants = {
	CHECK_HEADER_DELAY: 2000,

	MAX_DOWNLOAD_BLOCKS: 400, // maximum number of blocks we can download at once
	MAX_DOWNLOAD_BLOCKS_JOBS: 10, // maximum number of blocks jobs

	MAX_PAYLOAD_CLIENT: 5 * Units.MEGABYTE, // max size of a complete serialized response frame the WS client accepts
	MAX_PAYLOAD_SERVER: 3 * Units.MEGABYTE,

	MAX_PEERS_GET_API_NODES: 100,
	// default maxPayload value on the  WS socket server
	MAX_PEERS_GET_PEERS: 500,

	// Per-block framing cost of one protobuf `repeated bytes` entry: 1 tag byte + up to a 4-byte length
	// varint. The get-blocks controller adds this per block when budgeting the response against MAX_PAYLOAD_CLIENT.
	PROTO_BLOCK_OVERHEAD: 5,
	// Reserve for the fixed per-response framing: nes envelope (14B header + path + socket, each ≤100B)
	// plus the protobuf `headers` field. 512 covers the worst case.
	RESPONSE_ENVELOPE_RESERVE: 512,
};

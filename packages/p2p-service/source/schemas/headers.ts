import type { Interfaces } from "@mainsail/p2p-websocket";

// A bitmap has one entry per validator of the round. The round belongs to the block number given at
// `blockNumberPath` (from the root of the request or response), so a peer at another height, and with
// that possibly another validator count, is measured against its own milestone.
export const bitmap = (blockNumberPath: string): Interfaces.Schema => ({
	items: { type: "boolean" },
	limitToRoundValidators: { blockNumberPath, minimum: 0 },
	type: "array",
});

// The header every request and every response carries, as the codec hands it over: bitmaps unpacked,
// no proposed block hash while the peer has no proposal.
export const headers: Interfaces.Schema = {
	additionalProperties: false,
	properties: {
		blockNumber: { minimum: 1, type: "integer" },
		proposedBlockHash: { pattern: "^[0-9a-f]{64}$", type: "string" },
		round: { minimum: 0, type: "integer" },
		step: { maximum: 2, minimum: 0, type: "integer" },
		validatorsSignedPrecommit: bitmap("headers.blockNumber"),
		validatorsSignedPrevote: bitmap("headers.blockNumber"),
		version: { maxLength: 24, pattern: "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.-]+\\.\\d+)?$", type: "string" },
	},
	required: ["blockNumber", "round", "step", "validatorsSignedPrecommit", "validatorsSignedPrevote", "version"],
	type: "object",
};

// A request or a response that carries nothing but the header.
export const headersOnly: Interfaces.Schema = {
	additionalProperties: false,
	properties: { headers },
	required: ["headers"],
	type: "object",
};

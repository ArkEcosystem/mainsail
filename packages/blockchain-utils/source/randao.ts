const RANDAO_TAG = Buffer.from("MAINSAIL_RANDAO");

// Shared by the reveal signer (validator) and the reveal verifier (processor). The genesis block
// hash separates chains (same convention as serializeMessageForSignature), the tag prevents
// structural collisions with proposal/prevote/precommit payloads, and the block number
// keeps the reveal stable across round re-proposals at the same height.
export const randaoMessage = (genesisBlockHash: string, blockNumber: number): Buffer => {
	const blockNumberBuffer = Buffer.alloc(4);
	blockNumberBuffer.writeUInt32BE(blockNumber, 0);

	return Buffer.concat([RANDAO_TAG, Buffer.from(genesisBlockHash, "hex"), blockNumberBuffer]);
};

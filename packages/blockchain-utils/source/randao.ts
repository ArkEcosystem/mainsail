import type { Contracts } from "@mainsail/contracts";

const RANDAO_TAG = Buffer.from("MAINSAIL_RANDAO");

export const randaoMessage = (genesisBlockHash: string, parentRandaoReveal: string, blockNumber: number): Buffer => {
	const blockNumberBuffer = Buffer.alloc(4);
	blockNumberBuffer.writeUInt32BE(blockNumber, 0);

	return Buffer.concat([
		RANDAO_TAG,
		Buffer.from(genesisBlockHash, "hex"),
		Buffer.from(parentRandaoReveal, "hex"),
		blockNumberBuffer,
	]);
};

export const getPrevrandao = (
	hashFactory: Contracts.Crypto.HashFactory,
	previousBlock: Contracts.Crypto.Block,
): Buffer => hashFactory.keccak256(Buffer.from(previousBlock.randaoReveal, "hex"));

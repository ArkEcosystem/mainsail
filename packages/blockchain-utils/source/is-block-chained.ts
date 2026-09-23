import type { Contracts } from "@mainsail/contracts";

type BlockChainedDetails = {
	followsPrevious: boolean;
	isPlusOne: boolean;
	isChained: boolean;
};

const getBlockChainedDetails = (
	previousBlock: Contracts.Crypto.BlockHeader,
	nextBlock: Contracts.Crypto.BlockHeader,
): BlockChainedDetails => {
	const followsPrevious: boolean = nextBlock.parentHash === previousBlock.hash;
	const isPlusOne: boolean = nextBlock.number === previousBlock.number + 1;

	const isChained: boolean = followsPrevious && isPlusOne;

	return { followsPrevious, isChained, isPlusOne };
};

export const isBlockChained = (
	previousBlock: Contracts.Crypto.BlockHeader,
	nextBlock: Contracts.Crypto.BlockHeader,
): boolean => getBlockChainedDetails(previousBlock, nextBlock).isChained;

export const getBlockNotChainedErrorMessage = (
	previousBlock: Contracts.Crypto.BlockHeader,
	nextBlock: Contracts.Crypto.BlockHeader,
): string => {
	const details: BlockChainedDetails = getBlockChainedDetails(previousBlock, nextBlock);

	if (details.isChained) {
		throw new Error("Block had no chain error");
	}

	const messagePrefix: string =
		`Block { number: ${nextBlock.number}, hash: ${nextBlock.hash}, ` +
		`parentHash: ${nextBlock.parentHash} } is not chained to the ` +
		`previous block { number: ${previousBlock.number}, hash: ${previousBlock.hash} }`;

	let messageDetail: string | undefined;

	if (!details.followsPrevious) {
		messageDetail = `previous block hash mismatch`;
	} else if (!details.isPlusOne) {
		messageDetail = `number is not plus one`;
	}

	return `${messagePrefix}: ${messageDetail}`;
};

import { Contracts } from "@mainsail/contracts";

type BlockChainedDetails = {
	followsPrevious: boolean;
	isPlusOne: boolean;
	isAfterPrevious: boolean;
	isChained: boolean;
};

const getBlockChainedDetails = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): BlockChainedDetails => {
	const followsPrevious: boolean = nextBlock.previousBlock === previousBlock.id;
	const isPlusOne: boolean = nextBlock.height === previousBlock.height + 1;

	const isAfterPrevious: boolean = previousBlock.timestamp < nextBlock.timestamp;

	const isChained: boolean = followsPrevious && isPlusOne && isAfterPrevious;

	return { followsPrevious, isAfterPrevious, isChained, isPlusOne };
};

export const isBlockChained = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): boolean => getBlockChainedDetails(previousBlock, nextBlock).isChained;

export const getBlockNotChainedErrorMessage = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): string => {
	const details: BlockChainedDetails = getBlockChainedDetails(previousBlock, nextBlock);

	if (details.isChained) {
		throw new Error("Block had no chain error");
	}

	const messagePrefix: string =
		`Block { height: ${nextBlock.height}, id: ${nextBlock.id}, ` +
		`previousBlock: ${nextBlock.previousBlock} } is not chained to the ` +
		`previous block { height: ${previousBlock.height}, id: ${previousBlock.id} }`;

	let messageDetail: string | undefined;

	if (!details.followsPrevious) {
		messageDetail = `previous block id mismatch`;
	} else if (!details.isPlusOne) {
		messageDetail = `height is not plus one`;
	} else if (!details.isAfterPrevious) {
		messageDetail = `previous timestamp is after current timestamp: ${previousBlock.timestamp} VS ${nextBlock.timestamp}`;
	}

	return `${messagePrefix}: ${messageDetail}`;
};

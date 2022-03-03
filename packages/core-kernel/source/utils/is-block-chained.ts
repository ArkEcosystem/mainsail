import { Contracts } from "@arkecosystem/core-contracts";

type BlockChainedDetails = {
	followsPrevious: boolean;
	isPlusOne: boolean;
	previousSlot: number;
	nextSlot: number;
	isAfterPreviousSlot: boolean;
	isChained: boolean;
};

const getBlockChainedDetails = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	getTimeStampForBlock: (blockheight: number) => number,
	slots,
): BlockChainedDetails => {
	const followsPrevious: boolean = nextBlock.previousBlock === previousBlock.id;
	const isPlusOne: boolean = nextBlock.height === previousBlock.height + 1;

	const previousSlot: number = slots.getSlotNumber(getTimeStampForBlock, previousBlock.timestamp);
	const nextSlot: number = slots.getSlotNumber(getTimeStampForBlock, nextBlock.timestamp);
	const isAfterPreviousSlot: boolean = previousSlot < nextSlot;

	const isChained: boolean = followsPrevious && isPlusOne && isAfterPreviousSlot;

	return { followsPrevious, isAfterPreviousSlot, isChained, isPlusOne, nextSlot, previousSlot };
};

export const isBlockChained = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	getTimeStampForBlock: (blockheight: number) => number,
	slots,
): boolean => {
	const details: BlockChainedDetails = getBlockChainedDetails(previousBlock, nextBlock, getTimeStampForBlock, slots);
	return details.isChained;
};

export const getBlockNotChainedErrorMessage = (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	getTimeStampForBlock: (blockheight: number) => number,
	slots,
): string => {
	const details: BlockChainedDetails = getBlockChainedDetails(previousBlock, nextBlock, getTimeStampForBlock, slots);

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
	} else if (!details.isAfterPreviousSlot) {
		messageDetail =
			`previous slot is not smaller: ` +
			`${details.previousSlot} (derived from timestamp ${previousBlock.timestamp}) VS ` +
			`${details.nextSlot} (derived from timestamp ${nextBlock.timestamp})`;
	}

	return `${messagePrefix}: ${messageDetail}`;
};

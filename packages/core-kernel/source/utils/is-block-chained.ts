import { Contracts } from "@arkecosystem/core-contracts";

type BlockChainedDetails = {
	followsPrevious: boolean;
	isPlusOne: boolean;
	previousSlot: number;
	nextSlot: number;
	isAfterPreviousSlot: boolean;
	isChained: boolean;
};

const getBlockChainedDetails = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	slots: Contracts.Crypto.Slots,
): Promise<BlockChainedDetails> => {
	const followsPrevious: boolean = nextBlock.previousBlock === previousBlock.id;
	const isPlusOne: boolean = nextBlock.height === previousBlock.height + 1;

	const previousSlot: number = await slots.getSlotNumber(previousBlock.timestamp);
	const nextSlot: number = await slots.getSlotNumber(nextBlock.timestamp);
	const isAfterPreviousSlot: boolean = previousSlot < nextSlot;

	const isChained: boolean = followsPrevious && isPlusOne && isAfterPreviousSlot;

	return { followsPrevious, isAfterPreviousSlot, isChained, isPlusOne, nextSlot, previousSlot };
};

export const isBlockChained = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	slots: Contracts.Crypto.Slots,
): Promise<boolean> => (await getBlockChainedDetails(previousBlock, nextBlock, slots)).isChained;

export const getBlockNotChainedErrorMessage = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
	slots: Contracts.Crypto.Slots,
): Promise<string> => {
	const details: BlockChainedDetails = await getBlockChainedDetails(previousBlock, nextBlock, slots);

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

import { Contracts } from "@mainsail/contracts";

type BlockChainedDetails = {
	followsPrevious: boolean;
	isPlusOne: boolean;
	isAfterPrevious: boolean;
	isChained: boolean;
};

const getBlockChainedDetails = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): Promise<BlockChainedDetails> => {
	const followsPrevious: boolean = nextBlock.previousBlock === previousBlock.id;
	const isPlusOne: boolean = nextBlock.height === previousBlock.height + 1;

	const isAfterPrevious: boolean = previousBlock.timestamp < nextBlock.timestamp;

	const isChained: boolean = followsPrevious && isPlusOne && isAfterPrevious;

	return { followsPrevious, isAfterPrevious, isChained, isPlusOne };
};

export const isBlockChained = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): Promise<boolean> => (await getBlockChainedDetails(previousBlock, nextBlock)).isChained;

export const getBlockNotChainedErrorMessage = async (
	previousBlock: Contracts.Crypto.IBlockData,
	nextBlock: Contracts.Crypto.IBlockData,
): Promise<string> => {
	const details: BlockChainedDetails = await getBlockChainedDetails(previousBlock, nextBlock);

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
		messageDetail = `previous block is not earlier: ${previousBlock.timestamp} cd ${nextBlock.timestamp} `;
	}

	return `${messagePrefix}: ${messageDetail}`;
};

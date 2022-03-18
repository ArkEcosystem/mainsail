import { Contracts } from "@arkecosystem/core-contracts";

export const makeChainedBlocks = (length: number, blockFactory): Contracts.Crypto.IBlock[] => {
	const entitites: Contracts.Crypto.IBlock[] = [];
	let previousBlock; // first case uses genesis IBlockData
	const getPreviousBlock = () => previousBlock;

	for (let i = 0; i < length; i++) {
		if (previousBlock) {
			blockFactory.withOptions({ getPreviousBlock });
		}
		const entity: Contracts.Crypto.IBlock = blockFactory.make();
		entitites.push(entity);
		previousBlock = entity.data;
	}
	return entitites;
};

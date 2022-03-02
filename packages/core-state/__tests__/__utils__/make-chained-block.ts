import { Interfaces } from "@packages/crypto";

export const makeChainedBlocks = (length: number, blockFactory): Crypto.IBlock[] => {
	const entitites: Crypto.IBlock[] = [];
	let previousBlock; // first case uses genesis IBlockData
	const getPreviousBlock = () => previousBlock;

	for (let i = 0; i < length; i++) {
		if (previousBlock) {
			blockFactory.withOptions({ getPreviousBlock });
		}
		const entity: Crypto.IBlock = blockFactory.make();
		entitites.push(entity);
		previousBlock = entity.data;
	}
	return entitites;
};

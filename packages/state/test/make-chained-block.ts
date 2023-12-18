import { Contracts } from "@mainsail/contracts";

export const makeChainedBlocks = (length: number, blockFactory): Contracts.Crypto.Block[] => {
	const entitites: Contracts.Crypto.Block[] = [];
	let previousBlock; // first case uses genesis IBlockData
	const getPreviousBlock = () => previousBlock;

	for (let i = 0; i < length; i++) {
		if (previousBlock) {
			blockFactory.withOptions({ getPreviousBlock });
		}
		const entity: Contracts.Crypto.Block = blockFactory.make();
		entitites.push(entity);
		previousBlock = entity.data;
	}
	return entitites;
};
